import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Appbar, Chip, IconButton, Card, Divider, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';

const TEAMS_STORAGE_KEY = 'treasury_selected_teams';

type AthleteRow = Awaited<ReturnType<typeof treasuryService.getMonthlyAthletes>>[number];

const fmt = (val: number) =>
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function SalaryReport() {
  const theme = useTheme();
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

  // Real: sum of what was actually collected
  const realMensalidades = paid.reduce((s, a) => {
    const p = a.currentPayment!;
    return s + (p.valorPago ?? p.valorBase); // null = paid in full → use valorBase
  }, 0);
  const realSolidario = paid.reduce((s, a) => s + (a.currentPayment?.valorSolidario ?? 0), 0);
  const realJuros     = paid.reduce((s, a) => s + (a.currentPayment?.valorJuros     ?? 0), 0);
  const realSalary    = realMensalidades + realSolidario;

  // Projection: as if every athlete paid their full base amount
  const projMensalidades = athletes.reduce((s, a) => {
    const base = a.currentPayment?.valorBase ?? feeConfigs.get(a.atleta.teamId)?.valorBase ?? 0;
    return s + base;
  }, 0);
  const projSalary = projMensalidades + realSolidario; // solidário stays the same (unknown for unpaid)

  const displayMensalidades = showProjection ? projMensalidades : realMensalidades;
  const displaySolidario    = realSolidario; // always real
  const displaySalary       = showProjection ? projSalary : realSalary;

  const isPartial = (a: AthleteRow) => {
    const p = a.currentPayment;
    return p?.dataPagamento && p.valorPago !== null && p.valorPago !== undefined && p.valorPago < p.valorBase;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderRow = (a: AthleteRow, showAmount: boolean) => {
    const nome = a.atleta.surname?.trim() || a.atleta.name;
    const partial = isPartial(a);
    const valorBase = a.currentPayment?.valorBase ?? feeConfigs.get(a.atleta.teamId)?.valorBase;

    return (
      <View key={a.atleta.id} style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
      }}>
        <View style={{
          width: 5, height: 28, borderRadius: 3,
          backgroundColor: a.team?.color ?? theme.colors.primary,
          marginRight: 10,
        }} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{nome}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.55 }}>{a.team?.name ?? ''}</Text>
        </View>
        {showAmount && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="bodySmall">
              R$ {fmt(a.currentPayment!.valorPago ?? a.currentPayment!.valorBase)}
            </Text>
            {partial && (
              <Text style={{ fontSize: 10, color: '#F57C00' }}>parcial</Text>
            )}
          </View>
        )}
        {!showAmount && valorBase != null && (
          <Text variant="bodySmall" style={{ opacity: 0.35 }}>R$ {fmt(valorBase)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <Appbar.Header statusBarHeight={0} style={{ backgroundColor: 'transparent', elevation: 0 }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Calcular Salário" />
        </Appbar.Header>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Month navigator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <IconButton icon="chevron-left" size={20} onPress={() => adjustMonth(-1)} />
          <TouchableOpacity
            onPress={() => { setPickerYear(monthDate.getFullYear()); setMonthPickerVisible(true); }}
            style={{ minWidth: 160, alignItems: 'center' }}
          >
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{monthLabel}</Text>
          </TouchableOpacity>
          <IconButton icon="chevron-right" size={20} onPress={() => adjustMonth(1)} />
        </View>

        {/* Team chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {allTeams.map(team => (
            <Chip
              key={team.id}
              selected={selectedTeamIds.has(team.id)}
              onPress={() => toggleTeam(team.id)}
              style={{ backgroundColor: selectedTeamIds.has(team.id) ? team.color : undefined }}
              selectedColor="#fff"
            >
              {team.name}
            </Chip>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Summary card */}
            <Card mode="elevated" style={{ marginBottom: 20, backgroundColor: theme.colors.elevation.level2 }}>
              <Card.Content style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Mensalidades</Text>
                  <Text variant="bodyMedium">R$ {fmt(displayMensalidades)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Solidário</Text>
                  <Text variant="bodyMedium">R$ {fmt(displaySolidario)}</Text>
                </View>
                <Divider style={{ marginBottom: 14 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Salário</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    R$ {fmt(displaySalary)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
                  <Text variant="bodySmall" style={{ opacity: 0.55 }}>Juros (caixinha)</Text>
                  <Text variant="bodySmall" style={{ opacity: 0.55 }}>R$ {fmt(realJuros)}</Text>
                </View>

                {/* Projection toggle */}
                <Chip
                  compact
                  mode={showProjection ? 'flat' : 'outlined'}
                  selected={showProjection}
                  selectedColor={theme.colors.onPrimaryContainer}
                  style={showProjection ? { backgroundColor: theme.colors.primaryContainer } : {}}
                  icon="calculator"
                  onPress={() => setShowProjection(v => !v)}
                >
                  E se todos tivessem pago?
                </Chip>
                {showProjection && (
                  <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 6 }}>
                    Projeção com {athletes.length} atleta{athletes.length !== 1 ? 's' : ''} pagando o valor base completo.
                    {unpaid.length > 0
                      ? ` Inclui ${unpaid.length} ainda não pago${unpaid.length !== 1 ? 's' : ''}.`
                      : ''}
                    {paid.filter(isPartial).length > 0
                      ? ` Inclui ${paid.filter(isPartial).length} pagamento${paid.filter(isPartial).length !== 1 ? 's' : ''} parcial${paid.filter(isPartial).length !== 1 ? 'is' : ''}.`
                      : ''}
                  </Text>
                )}
              </Card.Content>
            </Card>

            {/* Paid list */}
            {paid.length > 0 && (
              <>
                <Text variant="labelLarge" style={{ marginBottom: 8, color: '#4CAF50' }}>
                  Pagaram ({paid.length})
                </Text>
                {paid.map(a => renderRow(a, true))}
                <View style={{ height: 20 }} />
              </>
            )}

            {/* Unpaid list */}
            {unpaid.length > 0 && (
              <>
                <Text variant="labelLarge" style={{ marginBottom: 8, color: theme.colors.error }}>
                  Não pagaram ({unpaid.length})
                </Text>
                {unpaid.map(a => renderRow(a, false))}
              </>
            )}

            {athletes.length === 0 && selectedTeamIds.size > 0 && (
              <Text variant="bodyLarge" style={{ opacity: 0.5, textAlign: 'center', marginTop: 40 }}>
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
              <IconButton icon="chevron-left" size={20} onPress={() => setPickerYear(y => y - 1)} />
              <Text variant="titleMedium" style={{ minWidth: 60, textAlign: 'center' }}>{pickerYear}</Text>
              <IconButton icon="chevron-right" size={20} onPress={() => setPickerYear(y => y + 1)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MONTHS.map((m, i) => {
                const isSelected = pickerYear === monthDate.getFullYear() && i === monthDate.getMonth();
                return (
                  <Chip
                    key={i}
                    selected={isSelected}
                    selectedColor={theme.colors.primary}
                    style={{ width: '30%' }}
                    onPress={() => { setMonthDate(new Date(pickerYear, i, 1)); setMonthPickerVisible(false); }}
                  >
                    {m}
                  </Chip>
                );
              })}
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
}
