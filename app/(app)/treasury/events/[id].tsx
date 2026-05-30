import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, Appbar, Card, Chip, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { treasuryService } from '../../../../src/services/treasuryService';
import { syncService } from '../../../../src/services/syncService';
import { useAuthStore } from '../../../../src/store/authStore';

export default function EventDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const isTesoureiro = user?.role === 'financeiro';

  const [data, setData] = useState<Awaited<ReturnType<typeof treasuryService.getEventAthletes>>>(null);

  // Edit dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedEp, setSelectedEp] = useState<any>(null);
  const [inputValorPago, setInputValorPago] = useState('');
  const [saving, setSaving] = useState(false);

  // Parcelas picker dialog
  const [parcelasDialogVisible, setParcelasDialogVisible] = useState(false);
  const [parcelasAtletaId, setParcelasAtletaId] = useState('');
  const [parcelasAtletaNome, setParcelasAtletaNome] = useState('');
  const [currentTotalParcelas, setCurrentTotalParcelas] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('treasury_event_collapsed').then(v => {
      if (v !== null) setCollapsed(v === 'true');
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('treasury_event_collapsed', String(collapsed));
  }, [collapsed]);

  const load = async () => {
    const result = await treasuryService.getEventAthletes(id);
    setData(result);
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const getParcelaStatus = (ep: any): 'pago' | 'parcial' | 'pendente' => {
    if (!ep.dataPagamento) return 'pendente';
    if (ep.valorPago !== null && ep.valorPago !== undefined && ep.valorPago < ep.valorParcela) return 'parcial';
    return 'pago';
  };

  const openPayDialog = (ep: any) => {
    setSelectedEp(ep);
    setInputValorPago(String(ep.valorParcela));
    setDialogVisible(true);
  };

  const openEditDialog = (ep: any) => {
    setSelectedEp(ep);
    setInputValorPago(String(ep.valorPago ?? ep.valorParcela));
    setDialogVisible(true);
  };

  const handleDirectPay = async (ep: any) => {
    await treasuryService.saveEventPayment(ep.id, true, null);
    syncService.triggerSync();
    load();
  };

  const handleDialogSave = async () => {
    if (!selectedEp) return;
    const valorPago = parseFloat(inputValorPago.replace(',', '.'));
    const isFullPayment = Math.abs(valorPago - selectedEp.valorParcela) < 0.01;
    setSaving(true);
    try {
      await treasuryService.saveEventPayment(selectedEp.id, true, isFullPayment ? null : valorPago);
      syncService.triggerSync();
      setDialogVisible(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUnpay = async () => {
    if (!selectedEp) return;
    Alert.alert('Desfazer pagamento', 'Marcar esta parcela como pendente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          await treasuryService.saveEventPayment(selectedEp.id, false, null);
          syncService.triggerSync();
          setDialogVisible(false);
          load();
        }
      },
    ]);
  };

  const openParcelasDialog = (atletaId: string, nome: string, parcelas: any[]) => {
    setParcelasAtletaId(atletaId);
    setParcelasAtletaNome(nome);
    setCurrentTotalParcelas(parcelas[0]?.totalParcelas ?? 1);
    setParcelasDialogVisible(true);
  };

  const handleParcelasChange = async (newTotal: number) => {
    setParcelasDialogVisible(false);
    await treasuryService.adjustEventAtletaParcelas(id, parcelasAtletaId, newTotal);
    syncService.triggerSync();
    load();
  };

  const handleDeleteEvent = () => {
    Alert.alert('Excluir evento', 'Remove o evento e todos os registros de pagamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await treasuryService.deleteEvent(id);
          syncService.triggerSync();
          router.back();
        }
      },
    ]);
  };

  const event = data?.event;
  const athletes = data?.athletes ?? [];

  const statusColors = {
    pago:     { bg: '#4CAF50', text: '#fff' },
    parcial:  { bg: '#F57C00', text: '#fff' },
    pendente: { bg: 'transparent', text: theme.colors.outline },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <Appbar.Header statusBarHeight={0} style={{ backgroundColor: 'transparent', elevation: 0 }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={event?.nome ?? 'Evento'} />
          {isTesoureiro && <Appbar.Action icon="delete" onPress={handleDeleteEvent} />}
        </Appbar.Header>
      </SafeAreaView>

      {event && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <View style={{
              backgroundColor: event.tipo === 'campeonato' ? '#7B1FA2' : '#1565C0',
              paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
            }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>{event.tipo}</Text>
            </View>
            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
              R$ {event.valorPorAtleta.toFixed(2)}/atleta
            </Text>
            <View style={{ flex: 1 }} />
            <Chip
              compact
              mode="outlined"
              onPress={() => setCollapsed(v => !v)}
              icon={collapsed ? 'chevron-down' : 'chevron-up'}
              style={{ alignSelf: 'center' }}
            >
              {collapsed ? 'Expandir' : 'Recolher'}
            </Chip>
          </View>
          {(() => {
            const [y, m, d] = event.dataInicio.split('-');
            const start = `${d}/${m}/${y}`;
            if (!event.dataFim) return <Text variant="bodySmall" style={{ opacity: 0.5 }}>{start}</Text>;
            const [y2, m2, d2] = event.dataFim.split('-');
            return <Text variant="bodySmall" style={{ opacity: 0.5 }}>{start} → {`${d2}/${m2}/${y2}`}</Text>;
          })()}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {athletes.map(({ atleta, team, parcelas }) => {
          const nome = atleta.surname?.trim() || atleta.name;
          const unpaidCount = parcelas.filter(p => !p.dataPagamento).length;
          const nextPending = parcelas.find(p => !p.dataPagamento);
          const totalParcelas = parcelas[0]?.totalParcelas ?? 1;

          return (
            <Card key={atleta.id} mode="elevated"
              style={{ marginBottom: 12, backgroundColor: theme.colors.elevation.level1 }}>
              <View style={{ padding: 12 }}>
                {/* Athlete header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{
                    width: 6, height: 32, borderRadius: 3,
                    backgroundColor: team?.color ?? theme.colors.primary,
                    marginRight: 10,
                  }} />
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', flex: 1 }}>{nome}</Text>
                  {isTesoureiro && (
                    <Chip
                      compact
                      mode="outlined"
                      onPress={() => openParcelasDialog(atleta.id, nome, parcelas)}
                      style={{ marginLeft: 8 }}
                    >
                      {totalParcelas === 1 ? 'À vista' : `${totalParcelas}x`} ✎
                    </Chip>
                  )}
                </View>

                {/* Quick pay next pending */}
                {isTesoureiro && nextPending && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: theme.colors.primaryContainer,
                    borderRadius: 10, padding: 10, marginBottom: 10,
                  }}>
                    <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onPrimaryContainer }}>
                      Próxima: Parcela {nextPending.numeroParcela}/{nextPending.totalParcelas} · R$ {nextPending.valorParcela.toFixed(2)}
                    </Text>
                    <Chip
                      compact mode="flat"
                      style={{ backgroundColor: theme.colors.primary }}
                      textStyle={{ color: '#fff', fontSize: 14 }}
                      onPress={() => handleDirectPay(nextPending)}
                    >
                      ✓
                    </Chip>
                  </View>
                )}

                {/* All parcelas */}
                {!collapsed && parcelas.map(p => {
                  const status = getParcelaStatus(p);
                  const sc = statusColors[status];
                  return (
                    <View key={p.id} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 6,
                      borderTopWidth: 1, borderTopColor: theme.colors.surfaceVariant,
                    }}>
                      <Text variant="bodySmall" style={{ flex: 1, opacity: 0.7 }}>
                        {p.numeroParcela}/{p.totalParcelas} · R$ {p.valorParcela.toFixed(2)}
                      </Text>
                      <View style={{
                        backgroundColor: sc.bg,
                        borderWidth: status === 'pendente' ? 1 : 0,
                        borderColor: theme.colors.outline,
                        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                        marginRight: isTesoureiro && p.dataPagamento ? 4 : 0,
                      }}>
                        <Text style={{ color: sc.text, fontSize: 11 }}>
                          {status === 'pago' ? 'Pago' : status === 'parcial' ? `Parcial R$${p.valorPago?.toFixed(2)}` : 'Pendente'}
                        </Text>
                      </View>
                      {isTesoureiro && p.dataPagamento && (
                        <Chip compact mode="outlined" onPress={() => openEditDialog(p)}
                          style={{ marginLeft: 4 }}>
                          ✎
                        </Chip>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Pay / Edit dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {selectedEp?.dataPagamento ? 'Editar pagamento' : 'Registrar pagamento'}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.7 }}>
              Parcela {selectedEp?.numeroParcela}/{selectedEp?.totalParcelas} · Valor cheio: R$ {selectedEp?.valorParcela?.toFixed(2)}
            </Text>
            <TextInput
              label="Valor pago (R$)"
              value={inputValorPago}
              onChangeText={setInputValorPago}
              mode="outlined"
              keyboardType="decimal-pad"
            />
          </Dialog.Content>
          <Dialog.Actions>
            {selectedEp?.dataPagamento && (
              <Chip compact mode="outlined" textStyle={{ color: theme.colors.error }}
                style={{ borderColor: theme.colors.error, marginRight: 'auto' }}
                onPress={handleUnpay}>
                Desfazer
              </Chip>
            )}
            <Chip compact onPress={() => setDialogVisible(false)}>Cancelar</Chip>
            <Chip compact mode="flat"
              style={{ backgroundColor: theme.colors.primary }}
              textStyle={{ color: '#fff' }}
              onPress={handleDialogSave}
              disabled={saving}>
              {saving ? '...' : 'Confirmar'}
            </Chip>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Parcelas picker dialog */}
      <Portal>
        <Dialog visible={parcelasDialogVisible} onDismiss={() => setParcelasDialogVisible(false)}>
          <Dialog.Title>{parcelasAtletaNome}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 320, paddingHorizontal: 0 }}>
            <ScrollView>
              <Text variant="bodySmall" style={{ opacity: 0.6, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
                Apenas parcelas não pagas serão alteradas.
              </Text>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleParcelasChange(n)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 24,
                    borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
                  }}
                >
                  <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>
                    {n === 1 ? 'À vista' : `${n}x`}
                  </Text>
                  {currentTotalParcelas === n && (
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
}
