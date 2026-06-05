import { View, ScrollView, FlatList, RefreshControl, Alert, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Portal, Modal, Menu, Dialog, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';
import { useFin, FinTokens } from '../../../src/theme';
import {
  money, toIsoDate, isoToShort,
  cardShadow, Avatar, Ring, DateStepper, IconBtn, Tabs, FieldLabel, FieldPill,
} from '../../../src/components/treasury/finance-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAMS_STORAGE_KEY = 'treasury_selected_teams';

type Tab = 'mensalidades' | 'eventos';

type AthleteItem = Awaited<ReturnType<typeof treasuryService.getMonthlyAthletes>>[number];
type EventParcelaItem = {
  id: string;
  eventoId: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  valorPago: number | null;
  eventNome: string | null;
  eventTipo: string | null;
  inputValorPago: string;
  markedPaid: boolean;
};

// Memoized so opening the modal / stepping the date doesn't re-render every card.
const AthleteRow = memo(function AthleteRow({
  item, fin, feeConfigs, isTesoureiro, onOpen, onQuickPay,
}: {
  item: AthleteItem;
  fin: FinTokens;
  feeConfigs: Map<string, any>;
  isTesoureiro: boolean;
  onOpen: (item: AthleteItem) => void;
  onQuickPay: (item: AthleteItem) => void;
}) {
  const p = item.currentPayment;
  const status: 'nao_pago' | 'pago' | 'parcial' =
    !p || !p.dataPagamento ? 'nao_pago'
    : (p.valorPago != null && p.valorPago < p.valorBase) ? 'parcial' : 'pago';
  const team = item.team;
  const color = team?.color ?? fin.brand;
  const name = item.atleta.surname?.trim() || item.atleta.name;
  const base = p?.valorBase ?? feeConfigs.get(item.atleta.teamId)?.valorBase ?? 0;
  const payDateStr = p?.dataPagamento ? isoToShort(p.dataPagamento) : '';

  return (
    <Pressable
      onPress={isTesoureiro ? () => onOpen(item) : undefined}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 11,
        backgroundColor: fin.surface, borderRadius: 14,
        paddingTop: 12, paddingRight: 13, paddingBottom: 12, paddingLeft: 15,
        marginBottom: 9, overflow: 'hidden', ...cardShadow(fin),
      }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />
      <Avatar name={name} color={color} fin={fin} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 18, color: fin.ink, letterSpacing: -0.2 }}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
            <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600' }}>{team?.name ?? ''}</Text>
          </View>
          {item.pendingEventCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: fin.brandSoft, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6 }}>
              <MaterialIcons name="bolt" size={12} color={fin.brand} />
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: fin.brand }}>
                {item.pendingEventCount} evento{item.pendingEventCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {item.overdueCount > 0 && (
            <View style={{ backgroundColor: fin.warnSoft, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: fin.warn }}>{item.overdueCount} em atraso</Text>
            </View>
          )}
        </View>
      </View>

      {status === 'pago' ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: fin.goodSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
            <MaterialIcons name="check" size={15} color={fin.good} />
            <Text style={{ fontWeight: '800', fontSize: 13, color: fin.good }}>Pago</Text>
          </View>
          {!!payDateStr && <Text style={{ fontSize: 11, color: fin.sub, fontWeight: '600' }}>{payDateStr}</Text>}
        </View>
      ) : isTesoureiro ? (
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {status === 'parcial' && (
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ backgroundColor: fin.warnSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 }}>
                <Text style={{ fontWeight: '800', fontSize: 13.5, color: fin.warn, fontVariant: ['tabular-nums'] }}>
                  {money(p?.valorPago ?? 0)}
                </Text>
              </View>
              <Text style={{ fontSize: 10.5, color: fin.sub, fontWeight: '600', marginTop: 3 }}>de {money(base)}</Text>
            </View>
          )}
          <Pressable
            onPress={() => onQuickPay(item)}
            style={{ backgroundColor: fin.brand, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>
              {status === 'parcial' ? 'Quitar' : 'Pagar'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
});

export default function TreasuryIndex() {
  const theme = useTheme();
  const fin = useFin();
  const router = useRouter();
  const { user } = useAuthStore();
  const isTesoureiro = user?.role === 'financeiro';

  // Teams
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [feeConfigs, setFeeConfigs] = useState<Map<string, any>>(new Map());

  // Header menu / pickers
  const [menuVisible, setMenuVisible] = useState(false);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Filter
  const [hidePaid, setHidePaid] = useState(false);
  const [lastUpdatedAtletaId, setLastUpdatedAtletaId] = useState<string | null>(null);

  // Tab & month
  const [tab, setTab] = useState<Tab>('mensalidades');
  const [monthDate, setMonthDate] = useState(new Date());

  // Shared payment date
  const [payDate, setPayDate] = useState(new Date());

  // Data
  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Payment modal (detailed editor — opened by tapping a card)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<AthleteItem | null>(null);
  const [modalDate, setModalDate] = useState(new Date());
  const [modalValorPago, setModalValorPago] = useState('');
  const [modalSolidario, setModalSolidario] = useState('0');
  const [modalJuros, setModalJuros] = useState('0');
  const [modalEventParcelas, setModalEventParcelas] = useState<EventParcelaItem[]>([]);
  const [modalSaving, setModalSaving] = useState(false);

  const mesReferencia = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (() => {
    const s = monthDate.toLocaleString('pt-BR', { month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const monthLabelFull = (() => {
    const s = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const teamsInitialized = useRef(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadTeams = async () => {
    const data = await teamService.getAll();
    setAllTeams(data);

    if (!teamsInitialized.current) {
      teamsInitialized.current = true;
      try {
        const saved = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
        if (saved) {
          const savedIds: string[] = JSON.parse(saved);
          const valid = savedIds.filter(id => data.some((t: any) => t.id === id));
          setSelectedTeamIds(new Set(valid.length > 0 ? valid : data.map((t: any) => t.id)));
        } else {
          setSelectedTeamIds(new Set(data.map((t: any) => t.id)));
        }
      } catch {
        setSelectedTeamIds(new Set(data.map((t: any) => t.id)));
      }
    }
  };

  const loadFeeConfigs = async (teamIds: Set<string>) => {
    const map = new Map<string, any>();
    for (const teamId of teamIds) {
      const c = await treasuryService.getFeeConfig(teamId);
      if (c) map.set(teamId, c);
    }
    setFeeConfigs(map);
  };

  const loadAthletes = useCallback(async (teamIds: Set<string>) => {
    if (teamIds.size === 0) { setAthletes([]); return; }
    setLoading(true);
    try {
      const data = await treasuryService.getMonthlyAthletes([...teamIds], mesReferencia);
      setAthletes(data);
    } finally {
      setLoading(false);
    }
  }, [mesReferencia]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await treasuryService.getEvents();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadTeams();
    if (tab === 'eventos') loadEvents();
  }, [tab]));

  useEffect(() => { loadFeeConfigs(selectedTeamIds); }, [selectedTeamIds]);

  useEffect(() => {
    if (!teamsInitialized.current) return;
    AsyncStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify([...selectedTeamIds]));
  }, [selectedTeamIds]);

  useEffect(() => {
    if (tab === 'mensalidades') loadAthletes(selectedTeamIds);
    else loadEvents();
  }, [tab, selectedTeamIds, mesReferencia]);

  useEffect(() => {
    return syncService.subscribe(() => {
      if (tab === 'mensalidades') loadAthletes(selectedTeamIds);
      else loadEvents();
    });
  }, [tab, selectedTeamIds, mesReferencia]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  const adjustMonth = useCallback((delta: number) =>
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1)), []);

  const adjustPayDate = useCallback((delta: number) =>
    setPayDate(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; }), []);

  const getPaymentStatus = (item: AthleteItem): 'nao_pago' | 'pago' | 'parcial' => {
    const p = item.currentPayment;
    if (!p || !p.dataPagamento) return 'nao_pago';
    if (p.valorPago !== null && p.valorPago !== undefined && p.valorPago < p.valorBase) return 'parcial';
    return 'pago';
  };

  // ── Quick pay (full value on payDate; "Quitar" completes a partial) ─────────

  const handleQuickPay = useCallback(async (item: AthleteItem) => {
    const feeConfig = feeConfigs.get(item.atleta.teamId);
    const p = item.currentPayment;
    const base = p?.valorBase ?? feeConfig?.valorBase;
    if (base == null) {
      Alert.alert(
        'Mensalidade não configurada',
        `Configure o valor da mensalidade do time "${item.team?.name}" primeiro.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configurar', onPress: () => router.push('/(app)/treasury/fee-config') },
        ]
      );
      return;
    }
    await treasuryService.savePayment({
      id: p?.id,
      atletaId: item.atleta.id,
      teamId: item.atleta.teamId,
      mesReferencia,
      valorBase: base,
      valorSolidario: p?.valorSolidario ?? 0,
      valorJuros: p?.valorJuros ?? 0,
      valorPago: base,
      dataPagamento: toIsoDate(payDate),
    });
    syncService.triggerSync();
    setLastUpdatedAtletaId(item.atleta.id);
    loadAthletes(selectedTeamIds);
  }, [feeConfigs, payDate, mesReferencia, selectedTeamIds, loadAthletes, router]);

  // ── Modal ────────────────────────────────────────────────────────────────

  const openModal = useCallback((item: AthleteItem) => {
    const feeConfig = feeConfigs.get(item.atleta.teamId);
    const p = item.currentPayment;
    const baseAmount = p?.valorBase ?? feeConfig?.valorBase ?? 0;

    // Open immediately with the synchronous fields; load event parcelas in the background.
    setModalItem(item);
    setModalDate(p?.dataPagamento ? new Date(p.dataPagamento) : new Date(payDate));
    setModalValorPago(String(p?.valorPago ?? baseAmount));
    setModalSolidario(String(p?.valorSolidario ?? 0));
    setModalJuros(String(p?.valorJuros ?? 0));
    setModalEventParcelas([]);
    setModalVisible(true);

    treasuryService.getPendingEventParcelas(item.atleta.id).then(pendingParcelas => {
      setModalEventParcelas(pendingParcelas.map(ep => {
        const restante = ep.valorPago != null
          ? parseFloat((ep.valorParcela - ep.valorPago).toFixed(2))
          : ep.valorParcela;
        return {
          id: ep.id, eventoId: ep.eventoId, numeroParcela: ep.numeroParcela,
          totalParcelas: ep.totalParcelas, valorParcela: ep.valorParcela, valorPago: ep.valorPago,
          eventNome: ep.eventNome, eventTipo: ep.eventTipo,
          inputValorPago: String(restante), markedPaid: false,
        };
      }));
    });
  }, [feeConfigs, payDate]);

  const handleModalSave = async () => {
    if (!modalItem) return;
    const feeConfig = feeConfigs.get(modalItem.atleta.teamId);
    const baseAmount = modalItem.currentPayment?.valorBase ?? feeConfig?.valorBase ?? 0;

    setModalSaving(true);
    try {
      await treasuryService.savePayment({
        id: modalItem.currentPayment?.id,
        atletaId: modalItem.atleta.id,
        teamId: modalItem.atleta.teamId,
        mesReferencia,
        valorBase: baseAmount,
        valorSolidario: parseFloat(modalSolidario.replace(',', '.')) || 0,
        valorJuros: parseFloat(modalJuros.replace(',', '.')) || 0,
        valorPago: parseFloat(modalValorPago.replace(',', '.')) || baseAmount,
        dataPagamento: toIsoDate(modalDate),
      });
      syncService.triggerSync();
      setLastUpdatedAtletaId(modalItem.atleta.id);
      setModalVisible(false);
      loadAthletes(selectedTeamIds);
    } finally {
      setModalSaving(false);
    }
  };

  const handleModalEventPay = async (parcelaId: string) => {
    const ep = modalEventParcelas.find(e => e.id === parcelaId);
    if (!ep) return;

    if (ep.markedPaid) {
      await treasuryService.saveEventPayment(parcelaId, false, null);
      syncService.triggerSync();
      setModalEventParcelas(prev =>
        prev
          .map(e => e.id === parcelaId ? { ...e, markedPaid: false } : e)
          .filter(e => e.eventoId !== ep.eventoId || e.numeroParcela <= ep.numeroParcela || e.markedPaid)
      );
      return;
    }

    const valorPago = parseFloat(ep.inputValorPago.replace(',', '.')) || ep.valorParcela;
    await treasuryService.saveEventPayment(
      parcelaId, true,
      Math.abs(valorPago - ep.valorParcela) < 0.01 ? null : valorPago,
      toIsoDate(modalDate),
    );
    syncService.triggerSync();
    setModalEventParcelas(prev => prev.map(e => e.id === parcelaId ? { ...e, markedPaid: true } : e));

    if (modalItem) {
      const allPending = await treasuryService.getPendingEventParcelas(modalItem.atleta.id);
      const next = allPending.find(p => p.eventoId === ep.eventoId);
      if (next) {
        setModalEventParcelas(prev => {
          if (prev.some(e => e.id === next.id)) return prev;
          const restante = next.valorPago != null
            ? parseFloat((next.valorParcela - next.valorPago).toFixed(2))
            : next.valorParcela;
          const newItem: EventParcelaItem = {
            id: next.id, eventoId: next.eventoId, numeroParcela: next.numeroParcela,
            totalParcelas: next.totalParcelas, valorParcela: next.valorParcela, valorPago: next.valorPago,
            eventNome: next.eventNome, eventTipo: next.eventTipo,
            inputValorPago: String(restante), markedPaid: false,
          };
          const idx = prev.findIndex(e => e.id === parcelaId);
          const result = [...prev];
          result.splice(idx + 1, 0, newItem);
          return result;
        });
      }
    }
  };

  // ── Summary (hero) ──────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    let previsto = 0, arrecadado = 0, pagaram = 0;
    for (const a of athletes) {
      const base = a.currentPayment?.valorBase ?? feeConfigs.get(a.atleta.teamId)?.valorBase ?? 0;
      previsto += base;
      const st = getPaymentStatus(a);
      if (st !== 'nao_pago') {
        arrecadado += a.currentPayment?.valorPago ?? 0;
        pagaram += 1;
      }
    }
    return {
      previsto, arrecadado, pagaram,
      total: athletes.length,
      pct: previsto > 0 ? Math.round((arrecadado / previsto) * 100) : 0,
      aReceber: Math.max(0, previsto - arrecadado),
    };
  }, [athletes, feeConfigs]);

  // ── Athlete card ─────────────────────────────────────────────────────────

  const renderAthlete = useCallback(({ item }: { item: AthleteItem }) => (
    <AthleteRow
      item={item}
      fin={fin}
      feeConfigs={feeConfigs}
      isTesoureiro={isTesoureiro}
      onOpen={openModal}
      onQuickPay={handleQuickPay}
    />
  ), [fin, feeConfigs, isTesoureiro, openModal, handleQuickPay]);

  // ── Event card ───────────────────────────────────────────────────────────

  const renderEvent = ({ item }: { item: any }) => {
    const teamIds = JSON.parse(item.teamIds) as string[];
    const eventTeams = allTeams.filter(t => teamIds.includes(t.id));
    const isCamp = item.tipo === 'campeonato';
    const accent = isCamp ? fin.campeonato : fin.amistoso;
    const accSoft = isCamp ? fin.campeonatoSoft : fin.amistosoSoft;
    const dateRange = isoToShort(item.dataInicio) + (item.dataFim ? '–' + isoToShort(item.dataFim) : '');

    return (
      <Pressable
        onPress={() => router.push(`/(app)/treasury/events/${item.id}`)}
        style={{ backgroundColor: fin.surface, borderRadius: 16, padding: 14, marginBottom: 10, ...cardShadow(fin) }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: accSoft, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={isCamp ? 'emoji-events' : 'sports-volleyball'} size={24} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 17, color: fin.ink, letterSpacing: -0.2 }}>
              {item.nome}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 }}>
              <View style={{ backgroundColor: accSoft, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: accent }}>
                  {item.tipo}
                </Text>
              </View>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: fin.sub, fontWeight: '600' }}>
                {eventTeams.map((t: any) => t.name).join(' · ')}
                {eventTeams.length > 0 ? ' · ' : ''}{money(item.valorPorAtleta)}/atleta
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Text style={{ fontSize: 11.5, color: fin.sub, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{dateRange}</Text>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: fin.track, overflow: 'hidden' }}>
            <View style={{ width: `${item.allPaid ? 100 : item.pct}%`, height: '100%', borderRadius: 3, backgroundColor: item.allPaid ? fin.good : accent }} />
          </View>
          {item.allPaid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="check" size={15} color={fin.good} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: fin.good }}>Quitado</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12.5, color: fin.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {item.pagosAtletas}/{item.nAtletas} <Text style={{ color: fin.sub, fontWeight: '600' }}>pagos</Text>
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  // ── Visible list (hidePaid filter keeps the just-updated athlete) ───────────

  const visibleAthletes = useMemo(() => (
    hidePaid
      ? athletes.filter(a => getPaymentStatus(a) !== 'pago' || a.atleta.id === lastUpdatedAtletaId)
      : athletes
  ), [athletes, hidePaid, lastUpdatedAtletaId]);
  const hiddenCount = athletes.length - visibleAthletes.length;

  // Hero header — memoized so tapping a card / opening the modal never re-renders the ring.
  const mensalidadesHeader = useMemo(() => (
    <>
      {/* Hero */}
      <View style={{ backgroundColor: fin.heroBg, borderRadius: 18, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 16, ...(fin.shadow === 'transparent' ? { borderWidth: 1, borderColor: fin.line } : {}) }}>
        <Ring pct={summary.pct} fin={fin} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, color: fin.sub, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>Arrecadado</Text>
          <Text style={{ fontWeight: '800', fontSize: 27, color: fin.ink, fontVariant: ['tabular-nums'] }}>{money(summary.arrecadado)}</Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
            <View>
              <Text style={{ fontWeight: '800', fontSize: 15, color: fin.good }}>
                {summary.pagaram}<Text style={{ color: fin.sub, fontWeight: '600' }}>/{summary.total}</Text>
              </Text>
              <Text style={{ fontSize: 10.5, color: fin.sub, fontWeight: '600' }}>pagaram</Text>
            </View>
            <View style={{ width: 1, backgroundColor: fin.line }} />
            <View>
              <Text style={{ fontWeight: '800', fontSize: 15, color: fin.warn, fontVariant: ['tabular-nums'] }}>{money(summary.aReceber)}</Text>
              <Text style={{ fontSize: 10.5, color: fin.sub, fontWeight: '600' }}>a receber</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Month nav + date stepper */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 }}>
        <Pressable
          onPress={() => { setPickerYear(monthDate.getFullYear()); setMonthPickerVisible(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Pressable onPress={() => adjustMonth(-1)} hitSlop={8}><MaterialIcons name="chevron-left" size={20} color={fin.sub} /></Pressable>
          <Text style={{ fontWeight: '800', fontSize: 14, color: fin.ink }}>{monthLabel}</Text>
          <Pressable onPress={() => adjustMonth(1)} hitSlop={8}><MaterialIcons name="chevron-right" size={20} color={fin.sub} /></Pressable>
        </Pressable>
        {isTesoureiro && <DateStepper date={payDate} onStep={adjustPayDate} fin={fin} />}
      </View>
    </>
  ), [fin, summary, monthLabel, monthDate, payDate, isTesoureiro, adjustMonth, adjustPayDate]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '800', fontSize: 26, color: fin.ink, letterSpacing: -0.4 }}>
              Financeiro
            </Text>
            <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', marginTop: 2 }}>
              Mensalidades e eventos do time
            </Text>
          </View>
          {tab === 'mensalidades' && (
            <IconBtn icon={hidePaid ? 'visibility-off' : 'visibility'} active={hidePaid} fin={fin} onPress={() => setHidePaid(v => !v)} />
          )}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconBtn icon="more-vert" fin={fin} onPress={() => setMenuVisible(true)} />}
          >
            <Menu.Item leadingIcon="account-multiple" title="Escolher times"
              onPress={() => { setMenuVisible(false); setTeamPickerVisible(true); }} />
            <Menu.Item leadingIcon="chart-bar" title="Calcular salário"
              onPress={() => { setMenuVisible(false); router.push('/(app)/treasury/salary-report'); }} />
            {isTesoureiro && (
              <>
                <Divider />
                <Menu.Item leadingIcon="cash" title="Valor da mensalidade"
                  onPress={() => { setMenuVisible(false); router.push('/(app)/treasury/fee-config'); }} />
              </>
            )}
          </Menu>
        </View>

        {/* Tabs */}
        <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            fin={fin}
            options={[
              { value: 'mensalidades', label: 'Mensalidades' },
              { value: 'eventos', label: 'Eventos' },
            ]}
          />
        </View>

        {/* Hidden-paid chip */}
        {tab === 'mensalidades' && hidePaid && hiddenCount > 0 && (
          <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
            <Pressable
              onPress={() => setHidePaid(false)}
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: fin.brandSoft, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 }}
            >
              <MaterialIcons name="visibility-off" size={14} color={fin.brand} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: fin.brand }}>
                {hiddenCount} pagos ocultos · <Text style={{ textDecorationLine: 'underline' }}>Mostrar</Text>
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Content */}
      {tab === 'mensalidades' ? (
        <FlatList
          data={visibleAthletes}
          keyExtractor={item => item.atleta.id}
          renderItem={renderAthlete}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadAthletes(selectedTeamIds)} />}
          ListHeaderComponent={mensalidadesHeader}
          ListEmptyComponent={!loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: fin.sub, fontSize: 15, fontWeight: '600' }}>
                {hidePaid ? 'Todos já pagaram!' : 'Nenhum atleta encontrado'}
              </Text>
            </View>
          ) : null}
        />
      ) : (
        <>
          <FlatList
            data={events}
            keyExtractor={item => item.id}
            renderItem={renderEvent}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} />}
            ListEmptyComponent={!loading ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ color: fin.sub, fontSize: 15, fontWeight: '600' }}>Nenhum evento cadastrado</Text>
              </View>
            ) : null}
          />
          {isTesoureiro && (
            <Pressable
              onPress={() => router.push('/(app)/treasury/new-event')}
              style={{
                position: 'absolute', right: 18, bottom: 18,
                flexDirection: 'row', alignItems: 'center', gap: 7,
                backgroundColor: fin.brand, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16,
                ...(fin.shadow === 'transparent' ? {} : { shadowColor: fin.brand, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }),
              }}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Novo evento</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Month picker dialog */}
      <Portal>
        <Dialog visible={monthPickerVisible} onDismiss={() => setMonthPickerVisible(false)}>
          <Dialog.Title>Selecionar mês</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <IconButton icon="chevron-left" size={20} onPress={() => setPickerYear(y => y - 1)} />
              <Text style={{ minWidth: 60, textAlign: 'center', fontSize: 18, fontWeight: '700', color: fin.ink }}>{pickerYear}</Text>
              <IconButton icon="chevron-right" size={20} onPress={() => setPickerYear(y => y + 1)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
                const isSelected = pickerYear === monthDate.getFullYear() && i === monthDate.getMonth();
                return (
                  <Pressable
                    key={i}
                    onPress={() => { setMonthDate(new Date(pickerYear, i, 1)); setMonthPickerVisible(false); }}
                    style={{ width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: isSelected ? fin.brand : fin.field }}
                  >
                    <Text style={{ fontWeight: '700', color: isSelected ? '#fff' : fin.ink }}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Team picker dialog */}
      <Portal>
        <Dialog visible={teamPickerVisible} onDismiss={() => setTeamPickerVisible(false)}>
          <Dialog.Title>Escolher times</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allTeams.map(team => {
                const sel = selectedTeamIds.has(team.id);
                return (
                  <Pressable
                    key={team.id}
                    onPress={() => toggleTeam(team.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderColor: sel ? team.color : fin.line, backgroundColor: sel ? team.color : 'transparent', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13 }}
                  >
                    <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: sel ? '#fff' : team.color }} />
                    <Text style={{ fontWeight: '700', fontSize: 13, color: sel ? '#fff' : fin.sub }}>{team.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable onPress={() => setTeamPickerVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Payment modal (detailed editor) */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={{ backgroundColor: fin.surface, margin: 16, borderRadius: 18, maxHeight: '88%' }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
            {modalItem && (
              <>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <Avatar
                    name={modalItem.atleta.surname?.trim() || modalItem.atleta.name}
                    color={modalItem.team?.color ?? fin.brand}
                    size={44} fin={fin}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 20, color: fin.ink, letterSpacing: -0.2 }}>
                      {modalItem.atleta.surname?.trim() || modalItem.atleta.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600' }}>
                      {monthLabelFull} · {modalItem.team?.name}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <DateStepper
                    date={modalDate}
                    fin={fin}
                    onStep={(d) => setModalDate(prev => { const n = new Date(prev); n.setDate(n.getDate() + d); return n; })}
                  />
                </View>

                {/* Valor pago */}
                <View style={{ marginBottom: 14 }}>
                  <FieldLabel fin={fin}>Valor pago</FieldLabel>
                  <FieldPill fin={fin} value={modalValorPago} onChangeText={setModalValorPago} prefix="R$" placeholder="0" keyboardType="decimal-pad" />
                </View>

                {/* Solidário + Juros */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <FieldLabel fin={fin}>Solidário</FieldLabel>
                    <FieldPill fin={fin} value={modalSolidario} onChangeText={setModalSolidario} prefix="R$" placeholder="0" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <FieldLabel fin={fin}>Juros</FieldLabel>
                    <FieldPill fin={fin} value={modalJuros} onChangeText={setModalJuros} prefix="R$" placeholder="0" keyboardType="decimal-pad" />
                  </View>
                </View>

                {/* Pending event parcelas */}
                {modalEventParcelas.length > 0 && (
                  <>
                    <FieldLabel fin={fin}>Parcelas de eventos pendentes</FieldLabel>
                    {modalEventParcelas.map(ep => (
                      <View key={ep.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: fin.line }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13.5, color: fin.ink }}>{ep.eventNome}</Text>
                          <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600' }}>
                            Parcela {ep.numeroParcela}/{ep.totalParcelas} · {money(ep.valorParcela)}
                            {ep.valorPago != null ? ` · pago ${money(ep.valorPago)}` : ''}
                          </Text>
                        </View>
                        <FieldPill
                          fin={fin}
                          value={ep.inputValorPago}
                          onChangeText={val => setModalEventParcelas(prev => prev.map(e => e.id === ep.id ? { ...e, inputValorPago: val } : e))}
                          keyboardType="decimal-pad"
                          disabled={ep.markedPaid}
                          style={{ width: 92, height: 42, paddingHorizontal: 10 }}
                        />
                        <Pressable
                          onPress={() => handleModalEventPay(ep.id)}
                          hitSlop={6}
                          style={{
                            width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: ep.markedPaid ? fin.good : fin.brandSoft,
                          }}
                        >
                          <MaterialIcons name="check" size={20} color={ep.markedPaid ? '#fff' : fin.brand} />
                        </Pressable>
                      </View>
                    ))}
                    <View style={{ height: 10 }} />
                  </>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Pressable onPress={() => setModalVisible(false)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: fin.line }}>
                    <Text style={{ color: fin.sub, fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={handleModalSave} disabled={modalSaving} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: fin.brand, opacity: modalSaving ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{modalSaving ? '...' : 'Confirmar'}</Text>
                  </Pressable>
                </View>

                {modalItem.currentPayment && (
                  <Pressable
                    onPress={() => {
                      Alert.alert('Remover registro', 'Remover este pagamento?', [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Remover', style: 'destructive', onPress: async () => {
                            await treasuryService.deletePayment(modalItem.currentPayment!.id);
                            syncService.triggerSync();
                            setModalVisible(false);
                            loadAthletes(selectedTeamIds);
                          }
                        },
                      ]);
                    }}
                    style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
                  >
                    <Text style={{ color: theme.colors.error, fontWeight: '700' }}>Remover registro</Text>
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}
