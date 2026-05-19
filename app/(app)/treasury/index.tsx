import { View, ScrollView, FlatList, RefreshControl, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text, Chip, SegmentedButtons, useTheme, Card, FAB, IconButton, Portal, Modal, Menu, Dialog, Divider } from 'react-native-paper';
import { TextInput as PaperInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../../src/store/authStore';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAMS_STORAGE_KEY = 'treasury_selected_teams';

type Tab = 'mensalidades' | 'eventos';

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDate = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

const formatDisplayDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

type AthleteItem = Awaited<ReturnType<typeof treasuryService.getMonthlyAthletes>>[number];
type EventParcelaItem = {
  id: string;
  eventoId: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  eventNome: string | null;
  eventTipo: string | null;
  inputValorPago: string;
  markedPaid: boolean;
};

export default function TreasuryIndex() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const isTesoureiro = user?.role === 'tesoureiro';

  // Teams
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [feeConfigs, setFeeConfigs] = useState<Map<string, any>>(new Map());

  // Header menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);

  // Month picker
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
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);

  // Data
  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<AthleteItem | null>(null);
  const [modalDate, setModalDate] = useState(new Date());
  const [showModalDatePicker, setShowModalDatePicker] = useState(false);
  const [modalValorPago, setModalValorPago] = useState('');
  const [modalSolidario, setModalSolidario] = useState('0');
  const [modalJuros, setModalJuros] = useState('0');
  const [modalEventParcelas, setModalEventParcelas] = useState<EventParcelaItem[]>([]);
  const [modalSaving, setModalSaving] = useState(false);

  const mesReferencia = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (() => {
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

  const loadAthletes = async (teamIds: Set<string>) => {
    if (teamIds.size === 0) { setAthletes([]); return; }
    setLoading(true);
    try {
      const data = await treasuryService.getMonthlyAthletes([...teamIds], mesReferencia);
      setAthletes(data);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    loadFeeConfigs(selectedTeamIds);
  }, [selectedTeamIds]);

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

  const adjustMonth = (delta: number) =>
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  const adjustPayDate = (delta: number) =>
    setPayDate(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });

  const getPaymentStatus = (item: AthleteItem): 'nao_pago' | 'pago' | 'parcial' => {
    const p = item.currentPayment;
    if (!p || !p.dataPagamento) return 'nao_pago';
    if (p.valorPago !== null && p.valorPago !== undefined && p.valorPago < p.valorBase) return 'parcial';
    return 'pago';
  };

  // ── Quick pay ─────────────────────────────────────────────────────────────

  const handleQuickPay = async (item: AthleteItem) => {
    const feeConfig = feeConfigs.get(item.atleta.teamId);
    if (!feeConfig) {
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
      id: item.currentPayment?.id,
      atletaId: item.atleta.id,
      teamId: item.atleta.teamId,
      mesReferencia,
      valorBase: feeConfig.valorBase,
      valorSolidario: 0,
      valorJuros: 0,
      valorPago: feeConfig.valorBase,
      dataPagamento: toIsoDate(payDate),
    });
    syncService.triggerSync();
    setLastUpdatedAtletaId(item.atleta.id);
    loadAthletes(selectedTeamIds);
  };

  // ── Modal ────────────────────────────────────────────────────────────────

  const openModal = async (item: AthleteItem) => {
    setModalItem(item);
    const feeConfig = feeConfigs.get(item.atleta.teamId);
    const p = item.currentPayment;
    const baseAmount = p?.valorBase ?? feeConfig?.valorBase ?? 0;

    setModalDate(p?.dataPagamento ? new Date(p.dataPagamento) : new Date(payDate));
    setModalValorPago(String(p?.valorPago ?? baseAmount));
    setModalSolidario(String(p?.valorSolidario ?? 0));
    setModalJuros(String(p?.valorJuros ?? 0));

    const pendingParcelas = await treasuryService.getPendingEventParcelas(item.atleta.id);
    setModalEventParcelas(pendingParcelas.map(ep => ({
      id: ep.id,
      eventoId: ep.eventoId,
      numeroParcela: ep.numeroParcela,
      totalParcelas: ep.totalParcelas,
      valorParcela: ep.valorParcela,
      eventNome: ep.eventNome,
      eventTipo: ep.eventTipo,
      inputValorPago: String(ep.valorParcela),
      markedPaid: false,
    })));

    setModalVisible(true);
  };

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
          // Remove auto-added next parcelas of same event (higher num, not paid)
          .filter(e => e.eventoId !== ep.eventoId || e.numeroParcela <= ep.numeroParcela || e.markedPaid)
      );
      return;
    }

    const valorPago = parseFloat(ep.inputValorPago.replace(',', '.')) || ep.valorParcela;
    await treasuryService.saveEventPayment(
      parcelaId, true,
      Math.abs(valorPago - ep.valorParcela) < 0.01 ? null : valorPago,
    );
    syncService.triggerSync();
    setModalEventParcelas(prev => prev.map(e => e.id === parcelaId ? { ...e, markedPaid: true } : e));

    if (modalItem) {
      const allPending = await treasuryService.getPendingEventParcelas(modalItem.atleta.id);
      const next = allPending.find(p => p.eventoId === ep.eventoId);
      if (next) {
        setModalEventParcelas(prev => {
          if (prev.some(e => e.id === next.id)) return prev;
          const newItem = {
            id: next.id,
            eventoId: next.eventoId,
            numeroParcela: next.numeroParcela,
            totalParcelas: next.totalParcelas,
            valorParcela: next.valorParcela,
            eventNome: next.eventNome,
            eventTipo: next.eventTipo,
            inputValorPago: String(next.valorParcela),
            markedPaid: false,
          };
          const idx = prev.findIndex(e => e.id === parcelaId);
          const result = [...prev];
          result.splice(idx + 1, 0, newItem);
          return result;
        });
      }
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const statusConfig: Record<string, { label: string; bg: string; text: string; border: boolean }> = {
    pago:     { label: 'Pago',     bg: '#4CAF50',      text: '#fff',                  border: false },
    parcial:  { label: 'Parcial',  bg: '#F57C00',      text: '#fff',                  border: false },
    nao_pago: { label: 'Não pago', bg: 'transparent',  text: theme.colors.outline,    border: true  },
  };

  const renderAthlete = ({ item }: { item: AthleteItem }) => {
    const status = getPaymentStatus(item);
    const sc = statusConfig[status];
    const isPaid = status === 'pago' || status === 'parcial';
    const payDateStr = item.currentPayment?.dataPagamento ? formatDisplayDate(item.currentPayment.dataPagamento) : null;
    const pendingEvents = item.pendingEventCount > 0;

    return (
      <Card
        mode="elevated"
        style={{ marginBottom: 8, backgroundColor: theme.colors.elevation.level1 }}
        onPress={isPaid ? () => openModal(item) : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
          <View style={{
            width: 6, height: 44, borderRadius: 3,
            backgroundColor: item.team?.color ?? theme.colors.primary,
            marginRight: 12,
          }} />
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
              {item.atleta.surname?.trim() || item.atleta.name}
            </Text>
            <Text variant="bodySmall" style={{ opacity: 0.6 }}>
              {item.team?.name ?? ''}
              {item.overdueCount > 0 ? ` · +${item.overdueCount} em atraso` : ''}
            </Text>
          </View>

          {isPaid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                {pendingEvents && (
                  <View style={{
                    backgroundColor: '#FF6F00', borderRadius: 8,
                    paddingHorizontal: 6, paddingVertical: 1,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>⚡ {item.pendingEventCount}</Text>
                  </View>
                )}
                <View style={{
                  backgroundColor: sc.bg, borderRadius: 10,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ color: sc.text, fontSize: 11 }}>{sc.label}</Text>
                </View>
              </View>
              <IconButton icon="pencil" size={14} style={{ margin: 0, width: 26, height: 26 }}
                onPress={() => openModal(item)} />
            </View>
          ) : isTesoureiro ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {pendingEvents && (
                <View style={{
                  backgroundColor: '#FF6F00', borderRadius: 8,
                  paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10 }}>⚡ {item.pendingEventCount}</Text>
                </View>
              )}
              <Chip
                compact
                mode="flat"
                style={{ backgroundColor: theme.colors.primary, height: 32 }}
                textStyle={{ color: '#fff', fontSize: 16 }}
                onPress={() => handleQuickPay(item)}
              >
                ✓
              </Chip>
            </View>
          ) : pendingEvents ? (
            <View style={{
              backgroundColor: '#FF6F00', borderRadius: 8,
              paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>⚡ {item.pendingEventCount}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  const renderEvent = ({ item }: { item: any }) => {
    const teamIds = JSON.parse(item.teamIds) as string[];
    const eventTeams = allTeams.filter(t => teamIds.includes(t.id));
    return (
      <Card
        mode="elevated"
        style={{ marginBottom: 8, backgroundColor: theme.colors.elevation.level1 }}
        onPress={() => router.push(`/(app)/treasury/events/${item.id}`)}
      >
        <Card.Content>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 4 }}>{item.nome}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                {eventTeams.map((t: any) => t.name).join(', ')}
                {eventTeams.length > 0 ? ' · ' : ''}
                R$ {item.valorPorAtleta.toFixed(2)}/atleta
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 2 }}>
                {formatDisplayDate(item.dataInicio)}
                {item.dataFim ? ` → ${formatDisplayDate(item.dataFim)}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'space-evenly' }}>
              <View style={{
                backgroundColor: item.tipo === 'campeonato' ? '#7B1FA2' : '#1565C0',
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 11 }}>{item.tipo}</Text>
              </View>
              {item.allPaid && (
                <View style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
                }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>Quitado</Text>
                </View>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary, flex: 1 }}>
            Tesouraria
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton icon="dots-vertical" size={22} onPress={() => setMenuVisible(true)} />
            }
          >
            <Menu.Item
              leadingIcon="account-multiple"
              title="Escolher times"
              onPress={() => { setMenuVisible(false); setTeamPickerVisible(true); }}
            />
            <Menu.Item
              leadingIcon="chart-bar"
              title="Calcular salário"
              onPress={() => { setMenuVisible(false); router.push('/(app)/treasury/salary-report'); }}
            />
            {isTesoureiro && (
              <>
                <Divider />
                <Menu.Item
                  leadingIcon="cash"
                  title="Valor da mensalidade"
                  onPress={() => { setMenuVisible(false); router.push('/(app)/treasury/fee-config'); }}
                />
              </>
            )}
          </Menu>
        </View>

        {/* Static team indicators */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
          {allTeams.filter(t => selectedTeamIds.has(t.id)).map(team => (
            <View key={team.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: team.color }} />
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>{team.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tab selector */}
        <SegmentedButtons
          value={tab}
          onValueChange={v => setTab(v as Tab)}
          buttons={[
            { value: 'mensalidades', label: 'Mensalidades' },
            { value: 'eventos', label: 'Eventos' },
          ]}
          style={{ marginHorizontal: 16, marginBottom: 8 }}
        />

        {tab === 'mensalidades' && (
          <>
            {/* Month navigator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
              <IconButton icon="chevron-left" size={20} onPress={() => adjustMonth(-1)} />
              <TouchableOpacity
                onPress={() => { setPickerYear(monthDate.getFullYear()); setMonthPickerVisible(true); }}
                style={{ minWidth: 160, alignItems: 'center' }}
              >
                <Text variant="titleSmall" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                  {monthLabel}
                </Text>
              </TouchableOpacity>
              <IconButton icon="chevron-right" size={20} onPress={() => adjustMonth(1)} />
            </View>

          </>
        )}
      </SafeAreaView>

      {/* Date picker (shared) */}
      {showPayDatePicker && (
        <DateTimePicker
          value={payDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPayDatePicker(Platform.OS === 'ios');
            if (date) setPayDate(date);
          }}
        />
      )}

      {/* Content */}
      {tab === 'mensalidades' ? (
        <FlatList
          data={hidePaid
            ? athletes.filter(a => getPaymentStatus(a) === 'nao_pago' || a.atleta.id === lastUpdatedAtletaId)
            : athletes}
          keyExtractor={item => item.atleta.id}
          renderItem={renderAthlete}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadAthletes(selectedTeamIds)} />}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton icon="minus" size={16} style={{ margin: 0 }} onPress={() => adjustPayDate(-1)} />
                <Chip compact onPress={() => setShowPayDatePicker(true)} icon="calendar">
                  {formatDate(payDate)}
                </Chip>
                <IconButton icon="plus" size={16} style={{ margin: 0 }} onPress={() => adjustPayDate(1)} />
              </View>
              <Chip
                compact
                selected={hidePaid}
                onPress={() => setHidePaid(v => !v)}
                icon={hidePaid ? 'eye-off' : 'eye'}
              >
                {hidePaid ? 'Mostrar pagos' : 'Ocultar pagos'}
              </Chip>
            </View>
          }
          ListEmptyComponent={!loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text variant="bodyLarge" style={{ opacity: 0.5 }}>
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
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEvents} />}
            ListEmptyComponent={!loading ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text variant="bodyLarge" style={{ opacity: 0.5 }}>Nenhum evento cadastrado</Text>
              </View>
            ) : null}
          />
          {isTesoureiro && (
            <FAB
              icon="plus"
              style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: theme.colors.primary }}
              color="#fff"
              onPress={() => router.push('/(app)/treasury/new-event')}
            />
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
              <Text variant="titleMedium" style={{ minWidth: 60, textAlign: 'center' }}>{pickerYear}</Text>
              <IconButton icon="chevron-right" size={20} onPress={() => setPickerYear(y => y + 1)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
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

      {/* Team picker dialog */}
      <Portal>
        <Dialog visible={teamPickerVisible} onDismiss={() => setTeamPickerVisible(false)}>
          <Dialog.Title>Escolher times</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Chip compact onPress={() => setTeamPickerVisible(false)}>Fechar</Chip>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Payment modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            margin: 16,
            borderRadius: 16,
            maxHeight: '88%',
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 20 }}>
            {modalItem && (
              <>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {modalItem.atleta.surname?.trim() || modalItem.atleta.name}
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 16 }}>
                  {monthLabel} · {modalItem.team?.name}
                </Text>

                {/* Date - centered */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text variant="labelMedium" style={{ marginBottom: 6 }}>Data do pagamento</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton icon="minus" size={16} style={{ margin: 0 }}
                      onPress={() => setModalDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} />
                    <Chip compact onPress={() => setShowModalDatePicker(true)} icon="calendar">
                      {formatDate(modalDate)}
                    </Chip>
                    <IconButton icon="plus" size={16} style={{ margin: 0 }}
                      onPress={() => setModalDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} />
                  </View>
                </View>
                {showModalDatePicker && (
                  <DateTimePicker
                    value={modalDate}
                    mode="date"
                    display="default"
                    onChange={(_, date) => {
                      setShowModalDatePicker(Platform.OS === 'ios');
                      if (date) setModalDate(date);
                    }}
                  />
                )}

                <PaperInput
                  label="Valor pago (R$)"
                  value={modalValorPago}
                  onChangeText={setModalValorPago}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={{ marginBottom: 12 }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <PaperInput
                    label="Solidário (R$)"
                    value={modalSolidario}
                    onChangeText={setModalSolidario}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                  <PaperInput
                    label="Juros (R$)"
                    value={modalJuros}
                    onChangeText={setModalJuros}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                </View>

                {/* Pending event parcelas */}
                {modalEventParcelas.length > 0 && (
                  <>
                    <Text variant="labelLarge" style={{ marginBottom: 10, opacity: 0.7 }}>
                      Parcelas de eventos pendentes
                    </Text>
                    {modalEventParcelas.map(ep => (
                      <View
                        key={ep.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingVertical: 8,
                          borderTopWidth: 1, borderTopColor: theme.colors.surfaceVariant,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{ep.eventNome}</Text>
                          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                            Parcela {ep.numeroParcela}/{ep.totalParcelas} · R$ {ep.valorParcela.toFixed(2)}
                          </Text>
                        </View>
                        <PaperInput
                          value={ep.inputValorPago}
                          onChangeText={val =>
                            setModalEventParcelas(prev => prev.map(e => e.id === ep.id ? { ...e, inputValorPago: val } : e))
                          }
                          mode="outlined"
                          keyboardType="decimal-pad"
                          style={{ width: 86, marginRight: 4 }}
                          dense
                          disabled={ep.markedPaid}
                        />
                        <IconButton
                          icon={ep.markedPaid ? 'check-circle' : 'check-circle-outline'}
                          iconColor={ep.markedPaid ? '#4CAF50' : theme.colors.primary}
                          size={26}
                          style={{ margin: 0 }}
                          onPress={() => handleModalEventPay(ep.id)}
                        />
                      </View>
                    ))}
                    <View style={{ height: 8 }} />
                  </>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 }}>
                  <Chip compact onPress={() => setModalVisible(false)} style={{ flex: 1 }}>
                    Cancelar
                  </Chip>
                  <Chip
                    compact
                    mode="flat"
                    style={{ flex: 1, backgroundColor: theme.colors.primary }}
                    textStyle={{ color: '#fff' }}
                    onPress={handleModalSave}
                    disabled={modalSaving}
                  >
                    {modalSaving ? '...' : 'Confirmar'}
                  </Chip>
                </View>

                {modalItem.currentPayment && (
                  <Chip
                    compact
                    mode="outlined"
                    textStyle={{ color: theme.colors.error }}
                    style={{ borderColor: theme.colors.error, marginBottom: 8 }}
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
                  >
                    Remover registro
                  </Chip>
                )}
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}
