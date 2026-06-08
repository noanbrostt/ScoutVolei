import { db } from '../database/db';
import { monthlyFeeConfig, payments, treasuryEvents, eventPayments, players, teams } from '../database/schemas';
import { eq, and, inArray, asc, isNull, or, isNotNull, lt } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const treasuryService = {

  // ── Fee Config ──────────────────────────────────────────────────────────────

  getFeeConfig: async (teamId: string) => {
    return db.select().from(monthlyFeeConfig)
      .where(and(eq(monthlyFeeConfig.teamId, teamId), eq(monthlyFeeConfig.deleted, false)))
      .get();
  },

  saveFeeConfig: async (teamId: string, valorBase: number, valorJurosPorDia: number) => {
    const now = new Date().toISOString();
    const existing = await treasuryService.getFeeConfig(teamId);
    if (existing) {
      await db.update(monthlyFeeConfig)
        .set({ valorBase, valorJurosPorDia, updatedAt: now, syncStatus: 'pending' })
        .where(eq(monthlyFeeConfig.id, existing.id));
    } else {
      await db.insert(monthlyFeeConfig).values({
        id: Crypto.randomUUID(),
        teamId,
        valorBase,
        valorJurosPorDia,
        createdAt: now,
        updatedAt: now,
      });
    }
  },

  // ── Monthly Payments ────────────────────────────────────────────────────────

  getMonthlyAthletes: async (teamIds: string[], mesReferencia: string) => {
    if (teamIds.length === 0) return [];

    const atletasRaw = await db.select({
      id: players.id,
      name: players.name,
      surname: players.surname,
      teamId: players.teamId,
      number: players.number,
      position: players.position,
    }).from(players)
      .where(and(inArray(players.teamId, teamIds), eq(players.deleted, false)));

    if (atletasRaw.length === 0) return [];

    const atletaIds = atletasRaw.map(a => a.id);

    const allPayments = await db.select().from(payments)
      .where(and(inArray(payments.atletaId, atletaIds), eq(payments.deleted, false)));

    const teamsData = await db.select({ id: teams.id, name: teams.name, color: teams.color })
      .from(teams)
      .where(and(inArray(teams.id, teamIds), eq(teams.deleted, false)));
    const teamMap = new Map(teamsData.map(t => [t.id, t]));

    // Count unique events with pending parcelas per athlete
    const pendingEps = await db.select({
      atletaId: eventPayments.atletaId,
      eventoId: eventPayments.eventoId,
    }).from(eventPayments)
      .where(and(
        inArray(eventPayments.atletaId, atletaIds),
        eq(eventPayments.deleted, false),
        or(
          isNull(eventPayments.dataPagamento),
          and(isNotNull(eventPayments.valorPago), lt(eventPayments.valorPago, eventPayments.valorParcela)),
        ),
      ));
    const eventPendingCount = new Map<string, number>();
    const byAthlete = new Map<string, Set<string>>();
    for (const row of pendingEps) {
      if (!byAthlete.has(row.atletaId)) byAthlete.set(row.atletaId, new Set());
      byAthlete.get(row.atletaId)!.add(row.eventoId);
    }
    for (const [atletaId, evts] of byAthlete) {
      eventPendingCount.set(atletaId, evts.size);
    }

    atletasRaw.sort((a, b) => {
      const nameA = `${a.name} ${a.surname ?? ''}`.trim().toLowerCase();
      const nameB = `${b.name} ${b.surname ?? ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });

    return atletasRaw.map(atleta => {
      const athletePayments = allPayments.filter(p => p.atletaId === atleta.id);
      const currentPayment = athletePayments.find(p => p.mesReferencia === mesReferencia) ?? null;
      const overdueCount = athletePayments.filter(p =>
        p.mesReferencia < mesReferencia && !p.dataPagamento
      ).length;
      return {
        atleta,
        team: teamMap.get(atleta.teamId) ?? null,
        currentPayment,
        overdueCount,
        pendingEventCount: eventPendingCount.get(atleta.id) ?? 0,
      };
    });
  },

  getPayment: async (atletaId: string, mesReferencia: string) => {
    return db.select().from(payments)
      .where(and(
        eq(payments.atletaId, atletaId),
        eq(payments.mesReferencia, mesReferencia),
        eq(payments.deleted, false),
      ))
      .get();
  },

  savePayment: async (data: {
    id?: string;
    atletaId: string;
    teamId: string;
    mesReferencia: string;
    valorBase: number;
    valorSolidario: number;
    valorJuros: number;
    valorPago: number;
    dataPagamento: string | null;
  }) => {
    const now = new Date().toISOString();
    if (data.id) {
      await db.update(payments).set({
        valorBase: data.valorBase,
        valorSolidario: data.valorSolidario,
        valorJuros: data.valorJuros,
        valorPago: data.valorPago,
        dataPagamento: data.dataPagamento,
        isento: false, // registrar pagamento sempre tira a isenção
        updatedAt: now,
        syncStatus: 'pending',
      }).where(eq(payments.id, data.id));
    } else {
      await db.insert(payments).values({
        id: Crypto.randomUUID(),
        atletaId: data.atletaId,
        teamId: data.teamId,
        mesReferencia: data.mesReferencia,
        valorBase: data.valorBase,
        valorSolidario: data.valorSolidario,
        valorJuros: data.valorJuros,
        valorPago: data.valorPago,
        dataPagamento: data.dataPagamento,
        observacao: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  },

  // Mark/unmark a single month as exempt (viagem, lesão, etc). Exempt months
  // are dropped from every total — they don't count as paid nor as pending.
  setIsento: async (data: {
    id?: string;
    atletaId: string;
    teamId: string;
    mesReferencia: string;
    isento: boolean;
    valorBase: number;
  }) => {
    const now = new Date().toISOString();
    if (data.id) {
      await db.update(payments).set({
        isento: data.isento,
        // isentar limpa qualquer registro de pagamento daquele mês
        ...(data.isento ? { dataPagamento: null, valorPago: null, valorSolidario: 0, valorJuros: 0 } : {}),
        updatedAt: now,
        syncStatus: 'pending',
      }).where(eq(payments.id, data.id));
    } else {
      await db.insert(payments).values({
        id: Crypto.randomUUID(),
        atletaId: data.atletaId,
        teamId: data.teamId,
        mesReferencia: data.mesReferencia,
        valorBase: data.valorBase,
        valorSolidario: 0,
        valorJuros: 0,
        valorPago: null,
        dataPagamento: null,
        isento: data.isento,
        observacao: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  },

  // Bulk exempt/un-exempt a set of athletes across a month range (inclusive).
  // Exempting creates a payment row when none exists; un-exempting only touches
  // existing rows (a month with no row simply goes back to pending).
  setIsentoRange: async (params: {
    atletas: { atletaId: string; teamId: string }[];
    mesInicio: string; // YYYY-MM
    mesFim: string;    // YYYY-MM
    isento: boolean;
  }) => {
    const { atletas, isento } = params;
    let [yi, mi] = params.mesInicio.split('-').map(Number);
    let [yf, mf] = params.mesFim.split('-').map(Number);
    if (yf < yi || (yf === yi && mf < mi)) { [yi, mi, yf, mf] = [yf, mf, yi, mi]; }

    const months: string[] = [];
    for (let y = yi, m = mi; y < yf || (y === yf && m <= mf);) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      if (++m > 12) { m = 1; y++; }
    }

    const teamIds = [...new Set(atletas.map(a => a.teamId))];
    const baseByTeam = new Map<string, number>();
    for (const tid of teamIds) {
      const c = await treasuryService.getFeeConfig(tid);
      baseByTeam.set(tid, c?.valorBase ?? 0);
    }

    const now = new Date().toISOString();
    for (const { atletaId, teamId } of atletas) {
      for (const mes of months) {
        const existing = await treasuryService.getPayment(atletaId, mes);
        if (existing) {
          await db.update(payments).set({
            isento,
            ...(isento ? { dataPagamento: null, valorPago: null, valorSolidario: 0, valorJuros: 0 } : {}),
            updatedAt: now,
            syncStatus: 'pending',
          }).where(eq(payments.id, existing.id));
        } else if (isento) {
          await db.insert(payments).values({
            id: Crypto.randomUUID(),
            atletaId,
            teamId,
            mesReferencia: mes,
            valorBase: baseByTeam.get(teamId) ?? 0,
            valorSolidario: 0,
            valorJuros: 0,
            valorPago: null,
            dataPagamento: null,
            isento: true,
            observacao: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  },

  // Lists every athlete (of the given teams) that has at least one exempt month,
  // with the sorted list of exempt months (YYYY-MM). For the "Mostrar isentos" view.
  getIsencoes: async (teamIds: string[]) => {
    if (teamIds.length === 0) return [];

    const atletasRaw = await db.select({
      id: players.id, name: players.name, surname: players.surname, teamId: players.teamId,
    }).from(players)
      .where(and(inArray(players.teamId, teamIds), eq(players.deleted, false)));
    if (atletasRaw.length === 0) return [];

    const atletaIds = atletasRaw.map(a => a.id);
    const isentos = await db.select().from(payments)
      .where(and(
        inArray(payments.atletaId, atletaIds),
        eq(payments.isento, true),
        eq(payments.deleted, false),
      ));

    const teamsData = await db.select({ id: teams.id, name: teams.name, color: teams.color })
      .from(teams).where(and(inArray(teams.id, teamIds), eq(teams.deleted, false)));
    const teamMap = new Map(teamsData.map(t => [t.id, t]));

    const byAthlete = new Map<string, string[]>();
    for (const p of isentos) {
      if (!byAthlete.has(p.atletaId)) byAthlete.set(p.atletaId, []);
      byAthlete.get(p.atletaId)!.push(p.mesReferencia);
    }

    return atletasRaw
      .filter(a => byAthlete.has(a.id))
      .map(a => ({
        atleta: a,
        team: teamMap.get(a.teamId) ?? null,
        meses: byAthlete.get(a.id)!.sort(),
      }))
      .sort((a, b) =>
        `${a.atleta.name} ${a.atleta.surname ?? ''}`.trim()
          .localeCompare(`${b.atleta.name} ${b.atleta.surname ?? ''}`.trim(), 'pt-BR'));
  },

  deletePayment: async (id: string) => {
    const now = new Date().toISOString();
    await db.update(payments)
      .set({ deleted: true, updatedAt: now, syncStatus: 'pending' })
      .where(eq(payments.id, id));
  },

  // Returns the first pending/partial parcela per event for a given athlete (for modal display)
  getPendingEventParcelas: async (atletaId: string) => {
    const rows = await db.select({
      id: eventPayments.id,
      eventoId: eventPayments.eventoId,
      numeroParcela: eventPayments.numeroParcela,
      totalParcelas: eventPayments.totalParcelas,
      valorParcela: eventPayments.valorParcela,
      valorPago: eventPayments.valorPago,
      eventNome: treasuryEvents.nome,
      eventTipo: treasuryEvents.tipo,
    }).from(eventPayments)
      .leftJoin(treasuryEvents, eq(eventPayments.eventoId, treasuryEvents.id))
      .where(and(
        eq(eventPayments.atletaId, atletaId),
        eq(eventPayments.deleted, false),
        or(
          isNull(eventPayments.dataPagamento),
          and(isNotNull(eventPayments.valorPago), lt(eventPayments.valorPago, eventPayments.valorParcela)),
        ),
      ))
      .orderBy(asc(eventPayments.eventoId), asc(eventPayments.numeroParcela));

    // Keep only first (lowest numeroParcela) per event
    const seen = new Set<string>();
    return rows.filter(row => {
      if (seen.has(row.eventoId)) return false;
      seen.add(row.eventoId);
      return true;
    });
  },

  // ── Events ──────────────────────────────────────────────────────────────────

  getEvents: async () => {
    const evts = await db.select().from(treasuryEvents)
      .where(eq(treasuryEvents.deleted, false))
      .orderBy(asc(treasuryEvents.dataInicio));

    if (evts.length === 0) return [];

    const allRows = await db.select({
      eventoId: eventPayments.eventoId,
      atletaId: eventPayments.atletaId,
      valorParcela: eventPayments.valorParcela,
      valorPago: eventPayments.valorPago,
      dataPagamento: eventPayments.dataPagamento,
    }).from(eventPayments)
      .where(and(
        inArray(eventPayments.eventoId, evts.map(e => e.id)),
        eq(eventPayments.deleted, false),
      ));

    // Per-event aggregates: money totals + athlete counts.
    type Agg = { esperado: number; arrecadado: number; pending: number; atletas: Map<string, boolean> };
    const agg = new Map<string, Agg>();
    for (const row of allRows) {
      let a = agg.get(row.eventoId);
      if (!a) { a = { esperado: 0, arrecadado: 0, pending: 0, atletas: new Map() }; agg.set(row.eventoId, a); }
      a.esperado += row.valorParcela;
      const isPaid = !!row.dataPagamento;
      a.arrecadado += isPaid ? (row.valorPago ?? row.valorParcela) : 0;
      if (!isPaid) a.pending += 1;
      // athlete is "fully paid" only if every one of their parcelas is paid
      const prev = a.atletas.get(row.atletaId);
      a.atletas.set(row.atletaId, (prev ?? true) && isPaid);
    }

    const withStatus = evts.map(e => {
      const a = agg.get(e.id);
      const nAtletas = a ? a.atletas.size : 0;
      const pagosAtletas = a ? [...a.atletas.values()].filter(Boolean).length : 0;
      const esperado = a?.esperado ?? 0;
      const arrecadado = a?.arrecadado ?? 0;
      const pending = a?.pending ?? 0;
      return {
        ...e,
        pendingCount: pending,
        allPaid: nAtletas > 0 && pending === 0,
        nAtletas,
        pagosAtletas,
        esperado,
        arrecadado,
        pct: esperado > 0 ? Math.round((arrecadado / esperado) * 100) : 0,
      };
    });

    withStatus.sort((a, b) => {
      if (a.allPaid !== b.allPaid) return a.allPaid ? 1 : -1;
      return a.dataInicio.localeCompare(b.dataInicio);
    });

    return withStatus;
  },

  getEvent: async (id: string) => {
    return db.select().from(treasuryEvents)
      .where(and(eq(treasuryEvents.id, id), eq(treasuryEvents.deleted, false)))
      .get();
  },

  createEvent: async (data: {
    nome: string;
    tipo: 'amistoso' | 'campeonato';
    teamIds: string[];
    dataInicio: string;
    dataFim?: string | null;
    valorPorAtleta: number;
    atletasParcelas: Array<{ atletaId: string; totalParcelas: number; valorParcela: number }>;
  }) => {
    const now = new Date().toISOString();
    const eventId = Crypto.randomUUID();

    await db.insert(treasuryEvents).values({
      id: eventId,
      nome: data.nome,
      tipo: data.tipo,
      teamIds: JSON.stringify(data.teamIds),
      dataInicio: data.dataInicio,
      dataFim: data.dataFim ?? null,
      valorPorAtleta: data.valorPorAtleta,
      observacao: null,
      createdAt: now,
      updatedAt: now,
    });

    for (const ap of data.atletasParcelas) {
      for (let i = 1; i <= ap.totalParcelas; i++) {
        await db.insert(eventPayments).values({
          id: Crypto.randomUUID(),
          atletaId: ap.atletaId,
          eventoId: eventId,
          numeroParcela: i,
          totalParcelas: ap.totalParcelas,
          valorParcela: ap.valorParcela,
          dataPagamento: null,
          valorPago: null,
          observacao: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return eventId;
  },

  deleteEvent: async (id: string) => {
    const now = new Date().toISOString();
    await db.update(treasuryEvents)
      .set({ deleted: true, updatedAt: now, syncStatus: 'pending' })
      .where(eq(treasuryEvents.id, id));
    await db.update(eventPayments)
      .set({ deleted: true, updatedAt: now, syncStatus: 'pending' })
      .where(eq(eventPayments.eventoId, id));
  },

  // Adjust totalParcelas for an athlete on an event (only unpaid parcelas can change value)
  adjustEventAtletaParcelas: async (eventoId: string, atletaId: string, newTotal: number) => {
    const now = new Date().toISOString();
    const existing = await db.select().from(eventPayments)
      .where(and(
        eq(eventPayments.eventoId, eventoId),
        eq(eventPayments.atletaId, atletaId),
        eq(eventPayments.deleted, false),
      ))
      .orderBy(asc(eventPayments.numeroParcela));

    const paid = existing.filter(ep => ep.dataPagamento !== null);
    const unpaid = existing.filter(ep => ep.dataPagamento === null);
    const paidCount = paid.length;
    const currentTotal = existing.length;

    if (newTotal < paidCount) return;

    const event = await db.select({ valorPorAtleta: treasuryEvents.valorPorAtleta })
      .from(treasuryEvents).where(eq(treasuryEvents.id, eventoId)).get();
    if (!event) return;

    // Remaining value = total - what was actually paid (use valorPago if partial, else valorParcela)
    const paidAmount = paid.reduce((sum, ep) => sum + (ep.valorPago ?? ep.valorParcela), 0);
    const remainingValue = event.valorPorAtleta - paidAmount;
    const remainingCount = newTotal - paidCount;
    const newValorParcela = remainingCount > 0
      ? parseFloat((remainingValue / remainingCount).toFixed(2))
      : 0;

    // Always update totalParcelas on paid rows (keeps the picker check in sync)
    for (const ep of paid) {
      await db.update(eventPayments)
        .set({ totalParcelas: newTotal, updatedAt: now, syncStatus: 'pending' })
        .where(eq(eventPayments.id, ep.id));
    }

    if (newTotal > currentTotal) {
      // Update existing unpaid rows
      for (const ep of unpaid) {
        await db.update(eventPayments)
          .set({ totalParcelas: newTotal, valorParcela: newValorParcela, updatedAt: now, syncStatus: 'pending' })
          .where(eq(eventPayments.id, ep.id));
      }
      // Add new parcelas
      for (let i = currentTotal + 1; i <= newTotal; i++) {
        await db.insert(eventPayments).values({
          id: Crypto.randomUUID(),
          atletaId,
          eventoId,
          numeroParcela: i,
          totalParcelas: newTotal,
          valorParcela: newValorParcela,
          dataPagamento: null,
          valorPago: null,
          observacao: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else if (newTotal < currentTotal) {
      // Remove unpaid parcelas from the end
      const sortedUnpaid = [...unpaid].sort((a, b) => b.numeroParcela - a.numeroParcela);
      const toRemove = currentTotal - newTotal;
      for (let i = 0; i < toRemove && i < sortedUnpaid.length; i++) {
        await db.update(eventPayments)
          .set({ deleted: true, updatedAt: now, syncStatus: 'pending' })
          .where(eq(eventPayments.id, sortedUnpaid[i].id));
      }
      for (const ep of sortedUnpaid.slice(toRemove)) {
        await db.update(eventPayments)
          .set({ totalParcelas: newTotal, valorParcela: newValorParcela, updatedAt: now, syncStatus: 'pending' })
          .where(eq(eventPayments.id, ep.id));
      }
    } else {
      // Same count — recalculate unpaid valorParcela (e.g. after a partial payment)
      for (const ep of unpaid) {
        await db.update(eventPayments)
          .set({ totalParcelas: newTotal, valorParcela: newValorParcela, updatedAt: now, syncStatus: 'pending' })
          .where(eq(eventPayments.id, ep.id));
      }
    }
  },

  // ── Event Athletes & Payments ───────────────────────────────────────────────

  getEventAthletes: async (eventoId: string) => {
    const event = await db.select().from(treasuryEvents)
      .where(and(eq(treasuryEvents.id, eventoId), eq(treasuryEvents.deleted, false)))
      .get();
    if (!event) return null;

    const teamIds = JSON.parse(event.teamIds) as string[];

    const atletasRaw = teamIds.length > 0
      ? await db.select().from(players)
          .where(and(inArray(players.teamId, teamIds), eq(players.deleted, false)))
      : [];

    const teamsData = teamIds.length > 0
      ? await db.select({ id: teams.id, name: teams.name, color: teams.color })
          .from(teams)
          .where(and(inArray(teams.id, teamIds), eq(teams.deleted, false)))
      : [];
    const teamMap = new Map(teamsData.map(t => [t.id, t]));

    const epRows = await db.select().from(eventPayments)
      .where(and(eq(eventPayments.eventoId, eventoId), eq(eventPayments.deleted, false)))
      .orderBy(asc(eventPayments.numeroParcela));

    atletasRaw.sort((a, b) =>
      `${a.name} ${a.surname ?? ''}`.trim()
        .localeCompare(`${b.name} ${b.surname ?? ''}`.trim(), 'pt-BR')
    );

    const byAthlete = new Map<string, typeof epRows>();
    for (const ep of epRows) {
      if (!byAthlete.has(ep.atletaId)) byAthlete.set(ep.atletaId, []);
      byAthlete.get(ep.atletaId)!.push(ep);
    }

    return {
      event,
      athletes: atletasRaw
        .filter(atleta => byAthlete.has(atleta.id))
        .map(atleta => ({
          atleta,
          team: teamMap.get(atleta.teamId) ?? null,
          parcelas: byAthlete.get(atleta.id)!,
        })),
    };
  },

  // paid=true: sets dataPagamento (defaults to today); paid=false: clears date
  saveEventPayment: async (id: string, paid: boolean, valorPago?: number | null, dataPagamento?: string | null) => {
    const now = new Date().toISOString();
    const day = dataPagamento ?? now.split('T')[0];
    await db.update(eventPayments).set({
      dataPagamento: paid ? day : null,
      valorPago: valorPago ?? null,
      updatedAt: now,
      syncStatus: 'pending',
    }).where(eq(eventPayments.id, id));
  },
};
