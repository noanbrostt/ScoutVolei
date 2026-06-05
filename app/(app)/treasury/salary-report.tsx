import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { useFin } from '../../../src/theme';
import { money, cardShadow, Avatar } from '../../../src/components/treasury/finance-ui';

const TEAMS_STORAGE_KEY = 'treasury_selected_teams';

type AthleteRow = Awaited<ReturnType<typeof treasuryService.getMonthlyAthletes>>[number];

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function SalaryReport() {
  const fin = useFin();
  const router = useRouter();

  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [feeConfigs, setFeeConfigs] = useState<Map<string, any>>(new Map());
  const [monthDate, setMonthDate] = useState(new Date());
  const [showProjection, setShowProjection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const mesReferencia = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (() => {
    const s = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  useEffect(() => {
    const load = async () => {
      const data = await teamService.getAll();
      setAllTeams(data);
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
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedTeamIds.size === 0) return;
    const load = async () => {
      const map = new Map<string, any>();
      for (const id of selectedTeamIds) {
        const c = await treasuryService.getFeeConfig(id);
        if (c) map.set(id, c);
      }
      setFeeConfigs(map);
    };
    load();
  }, [selectedTeamIds]);

  useEffect(() => {
    if (selectedTeamIds.size === 0) { setAthletes([]); return; }
    setLoading(true);
    treasuryService.getMonthlyAthletes([...selectedTeamIds], mesReferencia)
      .then(setAthletes)
      .finally(() => setLoading(false));
  }, [selectedTeamIds, mesReferencia]);

  const toggleTeam = (id: string) =>
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const adjustMonth = (delta: number) =>
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  // ── Calculations ────────────────────────────────────────────────────────────

  const paid   = athletes.filter(a => a.currentPayment?.dataPagamento);
  const unpaid = athletes.filter(a => !a.currentPayment?.dataPagamento);

  const realMensalidades = paid.reduce((s, a) => {
    const p = a.currentPayment!;
    return s + (p.valorPago ?? p.valorBase);
  }, 0);
  const realSolidario = paid.reduce((s, a) => s + (a.currentPayment?.valorSolidario ?? 0), 0);
  const realJuros     = paid.reduce((s, a) => s + (a.currentPayment?.valorJuros     ?? 0), 0);
  const realSalary    = realMensalidades + realSolidario;

  const projMensalidades = athletes.reduce((s, a) => {
    const base = a.currentPayment?.valorBase ?? feeConfigs.get(a.atleta.teamId)?.valorBase ?? 0;
    return s + base;
  }, 0);
  const projSalary = projMensalidades + realSolidario;

  const displayMensalidades = showProjection ? projMensalidades : realMensalidades;
  const displaySalary       = showProjection ? projSalary : realSalary;

  const isPartial = (a: AthleteRow) => {
    const p = a.currentPayment;
    return p?.dataPagamento && p.valorPago !== null && p.valorPago !== undefined && p.valorPago < p.valorBase;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const SummaryLine = ({ label, value, sub }: { label: string; value: string; sub?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: sub ? 12 : 13.5, color: fin.sub, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: sub ? 12 : 14, color: sub ? fin.sub : fin.ink, fontWeight: sub ? '600' : '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );

  const renderRow = (a: AthleteRow, showAmount: boolean, last: boolean) => {
    const nome = a.atleta.surname?.trim() || a.atleta.name;
    const color = a.team?.color ?? fin.brand;
    const partial = isPartial(a);
    const valorBase = a.currentPayment?.valorBase ?? feeConfigs.get(a.atleta.teamId)?.valorBase;

    return (
      <View
        key={a.atleta.id}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 13, borderTopWidth: last ? 0 : 0, borderBottomWidth: 1, borderBottomColor: fin.line }}
      >
        <Avatar name={nome} color={color} size={36} fontSize={13} fin={fin} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: fin.ink }}>{nome}</Text>
          <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 1 }}>{a.team?.name ?? ''}</Text>
        </View>
        {showAmount ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: fin.ink, fontVariant: ['tabular-nums'] }}>
              {money(a.currentPayment!.valorPago ?? a.currentPayment!.valorBase)}
            </Text>
            {partial && <Text style={{ fontSize: 10.5, color: fin.warn, fontWeight: '700' }}>parcial</Text>}
          </View>
        ) : valorBase != null ? (
          <Text style={{ fontSize: 13.5, color: fin.sub, fontWeight: '600', fontVariant: ['tabular-nums'], opacity: 0.7 }}>{money(valorBase)}</Text>
        ) : null}
      </View>
    );
  };

  const listCard = (rows: AthleteRow[], showAmount: boolean) => (
    <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
      {rows.map((a, i) => renderRow(a, showAmount, i === rows.length - 1))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={fin.ink} />
          </Pressable>
          <Text style={{ fontWeight: '800', fontSize: 19, color: fin.ink, letterSpacing: -0.3 }}>Calcular salário</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 }}>
        {/* Month navigator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
          <Pressable onPress={() => adjustMonth(-1)} hitSlop={8}><MaterialIcons name="chevron-left" size={22} color={fin.sub} /></Pressable>
          <Pressable
            onPress={() => { setPickerYear(monthDate.getFullYear()); setMonthPickerVisible(true); }}
            style={{ minWidth: 150, alignItems: 'center' }}
          >
            <Text style={{ fontWeight: '800', fontSize: 16, color: fin.ink }}>{monthLabel}</Text>
          </Pressable>
          <Pressable onPress={() => adjustMonth(1)} hitSlop={8}><MaterialIcons name="chevron-right" size={22} color={fin.sub} /></Pressable>
        </View>

        {/* Team chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
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

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={fin.brand} />
        ) : (
          <>
            {/* Summary card */}
            <View style={{ backgroundColor: fin.surface, borderRadius: 18, padding: 18, marginBottom: 20, ...cardShadow(fin) }}>
              <View style={{ gap: 8 }}>
                <SummaryLine label="Mensalidades" value={money(displayMensalidades)} />
                <SummaryLine label="Solidário" value={money(realSolidario)} />
              </View>
              <View style={{ height: 1, backgroundColor: fin.line, marginVertical: 14 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: fin.ink }}>Salário</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: fin.brand, fontVariant: ['tabular-nums'] }}>{money(displaySalary)}</Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <SummaryLine label="Juros (caixinha)" value={money(realJuros)} sub />
              </View>

              {/* Projection toggle */}
              <Pressable
                onPress={() => setShowProjection(v => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 16,
                  borderWidth: 1.5, borderColor: showProjection ? fin.brand : fin.line,
                  backgroundColor: showProjection ? fin.brand : 'transparent',
                  borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13,
                }}
              >
                <MaterialIcons name="calculate" size={16} color={showProjection ? '#fff' : fin.sub} />
                <Text style={{ fontWeight: '700', fontSize: 12.5, color: showProjection ? '#fff' : fin.sub }}>E se todos tivessem pago?</Text>
              </Pressable>
              {showProjection && (
                <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 8 }}>
                  Projeção com {athletes.length} atleta{athletes.length !== 1 ? 's' : ''} pagando o valor base completo.
                  {unpaid.length > 0 ? ` Inclui ${unpaid.length} ainda não pago${unpaid.length !== 1 ? 's' : ''}.` : ''}
                  {paid.filter(isPartial).length > 0
                    ? ` Inclui ${paid.filter(isPartial).length} pagamento${paid.filter(isPartial).length !== 1 ? 's' : ''} parcial${paid.filter(isPartial).length !== 1 ? 'is' : ''}.`
                    : ''}
                </Text>
              )}
            </View>

            {/* Paid list */}
            {paid.length > 0 && (
              <>
                <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.good, marginBottom: 8 }}>
                  Pagaram ({paid.length})
                </Text>
                {listCard(paid, true)}
                <View style={{ height: 20 }} />
              </>
            )}

            {/* Unpaid list */}
            {unpaid.length > 0 && (
              <>
                <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.warn, marginBottom: 8 }}>
                  Não pagaram ({unpaid.length})
                </Text>
                {listCard(unpaid, false)}
              </>
            )}

            {athletes.length === 0 && selectedTeamIds.size > 0 && (
              <Text style={{ color: fin.sub, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 40 }}>
                Nenhum atleta encontrado
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Month picker */}
      <Portal>
        <Dialog visible={monthPickerVisible} onDismiss={() => setMonthPickerVisible(false)}>
          <Dialog.Title>Selecionar mês</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Pressable onPress={() => setPickerYear(y => y - 1)} hitSlop={8}><MaterialIcons name="chevron-left" size={22} color={fin.sub} /></Pressable>
              <Text style={{ minWidth: 60, textAlign: 'center', fontSize: 18, fontWeight: '700', color: fin.ink }}>{pickerYear}</Text>
              <Pressable onPress={() => setPickerYear(y => y + 1)} hitSlop={8}><MaterialIcons name="chevron-right" size={22} color={fin.sub} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MONTHS.map((m, i) => {
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
    </View>
  );
}
