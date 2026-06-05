import { View, ScrollView, Alert, Pressable } from 'react-native';
import { Text, useTheme, Portal, Dialog, TextInput as PaperInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { treasuryService } from '../../../../src/services/treasuryService';
import { syncService } from '../../../../src/services/syncService';
import { useAuthStore } from '../../../../src/store/authStore';
import { useFin } from '../../../../src/theme';
import {
  money, toIsoDate, isoToShort,
  cardShadow, Avatar, DateStepper, IconBtn,
} from '../../../../src/components/treasury/finance-ui';

type Parcela = {
  id: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  valorPago: number | null;
  dataPagamento: string | null;
};

const PARCELA_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const parcLabel = (n: number) => (n === 1 ? 'À vista' : `${n}x`);

const getStatus = (p: Parcela): 'pago' | 'parcial' | 'pendente' => {
  if (!p.dataPagamento) return 'pendente';
  if (p.valorPago !== null && p.valorPago !== undefined && p.valorPago < p.valorParcela) return 'parcial';
  return 'pago';
};

const summarize = (parcelas: Parcela[]) => {
  let pagas = 0, pago = 0, totalValor = 0;
  for (const p of parcelas) {
    totalValor += p.valorParcela;
    if (p.dataPagamento) {
      pago += p.valorPago ?? p.valorParcela;
      if (getStatus(p) === 'pago') pagas += 1;
    }
  }
  const next = parcelas.find(p => getStatus(p) !== 'pago') ?? null;
  return {
    pagas, pago, totalValor,
    total: parcelas[0]?.totalParcelas ?? parcelas.length,
    next,
    pct: totalValor > 0 ? Math.round((pago / totalValor) * 100) : 0,
  };
};

export default function EventDetail() {
  const theme = useTheme();
  const fin = useFin();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const isTesoureiro = user?.role === 'financeiro';

  const [data, setData] = useState<Awaited<ReturnType<typeof treasuryService.getEventAthletes>>>(null);
  const [payDate, setPayDate] = useState(new Date());
  const [hidePaid, setHidePaid] = useState(false);

  // Parcelas count picker
  const [parcelasDialog, setParcelasDialog] = useState<{ atletaId: string; nome: string; current: number } | null>(null);

  // Manage parcelas (long-press) — pay a specific value / undo
  const [manage, setManage] = useState<{ nome: string; parcelas: Parcela[] } | null>(null);
  const [editEp, setEditEp] = useState<Parcela | null>(null);
  const [editValor, setEditValor] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => setData(await treasuryService.getEventAthletes(id));
  useFocusEffect(useCallback(() => { load(); }, [id]));

  const adjustPayDate = (delta: number) =>
    setPayDate(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });

  const handleQuickPay = async (ep: Parcela) => {
    await treasuryService.saveEventPayment(ep.id, true, null, toIsoDate(payDate));
    syncService.triggerSync();
    load();
  };

  const handleEditSave = async () => {
    if (!editEp) return;
    const valorPago = parseFloat(editValor.replace(',', '.'));
    const isFull = Math.abs(valorPago - editEp.valorParcela) < 0.01;
    setSaving(true);
    try {
      await treasuryService.saveEventPayment(editEp.id, true, isFull ? null : valorPago, toIsoDate(payDate));
      syncService.triggerSync();
      setEditEp(null); setManage(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUnpay = async (ep: Parcela) => {
    await treasuryService.saveEventPayment(ep.id, false, null);
    syncService.triggerSync();
    setEditEp(null); setManage(null);
    load();
  };

  const handleParcelasChange = async (newTotal: number) => {
    if (!parcelasDialog) return;
    const { atletaId } = parcelasDialog;
    setParcelasDialog(null);
    await treasuryService.adjustEventAtletaParcelas(id, atletaId, newTotal);
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
  const athletes = (data?.athletes ?? []) as { atleta: any; team: any; parcelas: Parcela[] }[];

  const isCamp = event?.tipo === 'campeonato';
  const accent = isCamp ? fin.campeonato : fin.amistoso;
  const accSoft = isCamp ? fin.campeonatoSoft : fin.amistosoSoft;

  // Overall progress
  const overall = (() => {
    let esperado = 0, arrecadado = 0;
    for (const a of athletes) {
      for (const p of a.parcelas) {
        esperado += p.valorParcela;
        if (p.dataPagamento) arrecadado += p.valorPago ?? p.valorParcela;
      }
    }
    return { esperado, arrecadado, pct: esperado > 0 ? Math.round((arrecadado / esperado) * 100) : 0 };
  })();

  const isQuitado = (parcelas: Parcela[]) => parcelas.length > 0 && parcelas.every(p => getStatus(p) === 'pago');
  const visible = hidePaid ? athletes.filter(a => !isQuitado(a.parcelas)) : athletes;

  const totalParcelasOf = (parcelas: Parcela[]) => parcelas[0]?.totalParcelas ?? 1;

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={fin.ink} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <IconBtn icon={hidePaid ? 'visibility-off' : 'visibility'} active={hidePaid} fin={fin} onPress={() => setHidePaid(v => !v)} />
          {isTesoureiro && (
            <Pressable onPress={handleDeleteEvent} hitSlop={8} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="delete" size={22} color={fin.sub} />
            </Pressable>
          )}
        </View>

        {/* Event meta */}
        {event && (
          <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
            <Text style={{ fontWeight: '800', fontSize: 23, color: fin.ink, letterSpacing: -0.4 }}>{event.nome}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <View style={{ backgroundColor: accSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: accent }}>{event.tipo}</Text>
              </View>
              <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600' }}>
                {money(event.valorPorAtleta)}/atleta
                {' · '}{isoToShort(event.dataInicio)}{event.dataFim ? '–' + isoToShort(event.dataFim) : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 }}>
              <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: fin.track, overflow: 'hidden' }}>
                <View style={{ width: `${overall.pct}%`, height: '100%', borderRadius: 4, backgroundColor: accent }} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: fin.ink, fontVariant: ['tabular-nums'] }}>
                {money(overall.arrecadado)} <Text style={{ color: fin.sub, fontWeight: '600' }}>/ {money(overall.esperado)}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Count + date stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 }}>
          <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '700' }}>{athletes.length} atletas</Text>
          {isTesoureiro && <DateStepper date={payDate} onStep={adjustPayDate} fin={fin} />}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}>
        {visible.map(({ atleta, team, parcelas }) => {
          const nome = atleta.surname?.trim() || atleta.name;
          const color = team?.color ?? fin.brand;
          const sm = summarize(parcelas);
          const total = totalParcelasOf(parcelas);
          // Última parcela com pagamento registrado (para desfazer).
          const lastPaid = [...parcelas].reverse().find(p => !!p.dataPagamento) ?? null;

          return (
            <Pressable
              key={atleta.id}
              onLongPress={isTesoureiro ? () => setManage({ nome, parcelas }) : undefined}
              style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 13, paddingLeft: 17, marginBottom: 10, overflow: 'hidden', ...cardShadow(fin) }}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />

              {/* Card header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <Avatar name={nome} color={color} size={40} fontSize={15} fin={fin} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: fin.ink, letterSpacing: -0.2 }}>{nome}</Text>
                  <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 2 }}>{team?.name ?? ''}</Text>
                </View>
                <Pressable
                  onPress={isTesoureiro ? () => setParcelasDialog({ atletaId: atleta.id, nome, current: total }) : undefined}
                  style={{ borderWidth: 1.5, borderColor: fin.line, borderRadius: 9, paddingVertical: 5, paddingHorizontal: 10 }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 12.5, color: fin.sub }}>{parcLabel(total)}</Text>
                </Pressable>
              </View>

              {/* Bar body */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: fin.ink, fontVariant: ['tabular-nums'] }}>
                    {money(sm.pago)} <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600' }}>/ {money(sm.totalValor)}</Text>
                  </Text>
                  <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '700' }}>{sm.pagas} de {sm.total} pagas</Text>
                </View>

                {/* Segmented bar */}
                <View style={{ flexDirection: 'row', gap: 2, height: 8, marginTop: 8 }}>
                  {parcelas.map(p => {
                    const st = getStatus(p);
                    return (
                      <View key={p.id} style={{
                        flex: 1, borderRadius: 2,
                        backgroundColor: st === 'pago' ? fin.good : st === 'parcial' ? fin.warn : fin.track,
                      }} />
                    );
                  })}
                </View>

                {isTesoureiro && (sm.next || lastPaid) && (
                  sm.next ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 11 }}>
                      <Pressable
                        onPress={() => handleQuickPay(sm.next!)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: fin.brand, borderRadius: 12, paddingVertical: 9 }}
                      >
                        <MaterialIcons name="check" size={16} color={fin.brand} />
                        <Text style={{ fontWeight: '800', fontSize: 13.5, color: fin.brand }}>
                          Pagar {sm.next.numeroParcela}ª parcela · {money(sm.next.valorParcela)}
                        </Text>
                      </Pressable>
                      {lastPaid && (
                        <Pressable
                          onPress={() => handleUnpay(lastPaid)}
                          style={{ width: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.error, borderRadius: 12 }}
                        >
                          <MaterialIcons name="undo" size={19} color={theme.colors.error} />
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleUnpay(lastPaid!)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11, borderWidth: 1.5, borderColor: theme.colors.error, borderRadius: 12, paddingVertical: 9 }}
                    >
                      <MaterialIcons name="undo" size={16} color={theme.colors.error} />
                      <Text style={{ fontWeight: '800', fontSize: 13.5, color: theme.colors.error }}>
                        Desfazer {lastPaid!.numeroParcela}ª parcela
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Parcelas count picker */}
      <Portal>
        <Dialog visible={!!parcelasDialog} onDismiss={() => setParcelasDialog(null)}>
          <Dialog.Title>{parcelasDialog?.nome}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', marginBottom: 12 }}>
              Apenas parcelas não pagas serão alteradas.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PARCELA_OPTIONS.map(n => {
                const sel = parcelasDialog?.current === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => handleParcelasChange(n)}
                    style={{ borderWidth: 1.5, borderColor: sel ? fin.brand : fin.line, backgroundColor: sel ? fin.brand : 'transparent', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 12 }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 12.5, color: sel ? '#fff' : fin.sub }}>{parcLabel(n)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Manage parcelas (long-press) */}
      <Portal>
        <Dialog visible={!!manage && !editEp} onDismiss={() => setManage(null)}>
          <Dialog.Title>{manage?.nome}</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView style={{ maxHeight: 360 }}>
              {manage?.parcelas.map(p => {
                const st = getStatus(p);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { setEditEp(p); setEditValor(String(p.valorPago ?? p.valorParcela)); }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: fin.line }}
                  >
                    <Text style={{ width: 30, fontSize: 13, fontWeight: '700', color: fin.sub, fontVariant: ['tabular-nums'] }}>{p.numeroParcela}ª</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: fin.ink, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{money(p.valorParcela)}</Text>
                    {st === 'pago' ? (
                      <View style={{ backgroundColor: fin.goodSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: fin.good }}>Pago</Text>
                      </View>
                    ) : st === 'parcial' ? (
                      <View style={{ backgroundColor: fin.warnSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: fin.warn }}>{money(p.valorPago ?? 0)}</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: fin.brand }}>Registrar ›</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Pressable onPress={() => setManage(null)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit single parcela */}
      <Portal>
        <Dialog visible={!!editEp} onDismiss={() => setEditEp(null)}>
          <Dialog.Title>{editEp?.dataPagamento ? 'Editar pagamento' : 'Registrar pagamento'}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', marginBottom: 12 }}>
              Parcela {editEp?.numeroParcela}/{editEp?.totalParcelas} · Valor cheio: {money(editEp?.valorParcela ?? 0)}
            </Text>
            <PaperInput label="Valor pago (R$)" value={editValor} onChangeText={setEditValor} mode="outlined" keyboardType="decimal-pad" />
          </Dialog.Content>
          <Dialog.Actions>
            {editEp?.dataPagamento && (
              <Pressable onPress={() => handleUnpay(editEp)} style={{ marginRight: 'auto', paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: theme.colors.error, fontWeight: '700' }}>Desfazer</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setEditEp(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: fin.sub, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleEditSave} disabled={saving} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: fin.brand, fontWeight: '800' }}>{saving ? '...' : 'Confirmar'}</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
