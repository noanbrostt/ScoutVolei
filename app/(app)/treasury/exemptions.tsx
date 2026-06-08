import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { cardShadow, Avatar, PillButton, FieldLabel } from '../../../src/components/treasury/finance-ui';

const TEAMS_STORAGE_KEY = 'treasury_selected_teams';
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type AthleteRow = Awaited<ReturnType<typeof treasuryService.getMonthlyAthletes>>[number];

const monthRef = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export default function Exemptions() {
  const fin = useFin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [selectedAtletaIds, setSelectedAtletaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isentosVisible, setIsentosVisible] = useState(false);
  const [isentos, setIsentos] = useState<Awaited<ReturnType<typeof treasuryService.getIsencoes>>>([]);
  const [isentosLoading, setIsentosLoading] = useState(false);

  const [inicio, setInicio] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fim, setFim] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'inicio' | 'fim'>('inicio');
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      const teams = await teamService.getAll();
      let ids: string[] = teams.map((t: any) => t.id);
      try {
        const saved = await AsyncStorage.getItem(TEAMS_STORAGE_KEY);
        if (saved) {
          const savedIds: string[] = JSON.parse(saved);
          const valid = savedIds.filter(id => teams.some((t: any) => t.id === id));
          if (valid.length > 0) ids = valid;
        }
      } catch {}
      setSelectedTeamIds(new Set(ids));
      const data = await treasuryService.getMonthlyAthletes(ids, monthRef(new Date()));
      setAthletes(data);
      setLoading(false);
    };
    load();
  }, []);

  const toggleAtleta = (id: string) =>
    setSelectedAtletaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const showIsentos = async () => {
    setIsentosVisible(true);
    setIsentosLoading(true);
    try {
      setIsentos(await treasuryService.getIsencoes([...selectedTeamIds]));
    } finally {
      setIsentosLoading(false);
    }
  };

  // Agrupa meses YYYY-MM consecutivos em intervalos legíveis ("Jun 2026 – Ago 2026").
  const formatRanges = (meses: string[]) => {
    const idxs = meses
      .map(s => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); })
      .sort((a, b) => a - b);
    const label = (idx: number) => `${MONTHS[idx % 12]} ${Math.floor(idx / 12)}`;
    const ranges: string[] = [];
    let start = idxs[0], prev = idxs[0];
    for (let i = 1; i <= idxs.length; i++) {
      if (i < idxs.length && idxs[i] === prev + 1) { prev = idxs[i]; continue; }
      ranges.push(start === prev ? label(start) : `${label(start)} – ${label(prev)}`);
      if (i < idxs.length) { start = idxs[i]; prev = idxs[i]; }
    }
    return ranges;
  };

  const openPicker = (target: 'inicio' | 'fim') => {
    setPickerTarget(target);
    setPickerYear((target === 'inicio' ? inicio : fim).getFullYear());
    setPickerVisible(true);
  };

  const pickMonth = (monthIndex: number) => {
    const d = new Date(pickerYear, monthIndex, 1);
    if (pickerTarget === 'inicio') {
      setInicio(d);
      if (fim < d) setFim(d);
    } else {
      setFim(d);
      if (d < inicio) setInicio(d);
    }
    setPickerVisible(false);
  };

  const monthsCount = (() => {
    const a = inicio.getFullYear() * 12 + inicio.getMonth();
    const b = fim.getFullYear() * 12 + fim.getMonth();
    return Math.abs(b - a) + 1;
  })();

  const apply = async (isento: boolean) => {
    if (selectedAtletaIds.size === 0) {
      Alert.alert('Selecione atletas', 'Escolha ao menos um atleta para aplicar a isenção.');
      return;
    }
    const atletas = athletes
      .filter(a => selectedAtletaIds.has(a.atleta.id))
      .map(a => ({ atletaId: a.atleta.id, teamId: a.atleta.teamId }));

    const verb = isento ? 'Isentar' : 'Remover isenção de';
    Alert.alert(
      `${isento ? 'Isentar' : 'Remover isenção'}`,
      `${verb} ${atletas.length} atleta${atletas.length !== 1 ? 's' : ''} de ${monthLabel(inicio)} até ${monthLabel(fim)} (${monthsCount} ${monthsCount !== 1 ? 'meses' : 'mês'})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSaving(true);
            try {
              await treasuryService.setIsentoRange({
                atletas,
                mesInicio: monthRef(inicio),
                mesFim: monthRef(fim),
                isento,
              });
              syncService.triggerSync();
              router.back();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={fin.ink} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '800', fontSize: 19, color: fin.ink, letterSpacing: -0.3 }}>Isenções</Text>
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600' }}>Dispensar mensalidade por período</Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={fin.brand} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}>
          {/* Período */}
          <FieldLabel fin={fin}>Período</FieldLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            {(['inicio', 'fim'] as const).map((target, idx) => (
              <View key={target} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {idx === 1 && <MaterialIcons name="arrow-forward" size={18} color={fin.sub} />}
                <Pressable
                  onPress={() => openPicker(target)}
                  style={{ flex: 1, minWidth: 0, backgroundColor: fin.field, borderWidth: 1.5, borderColor: fin.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 14.5, color: fin.ink }}>{monthLabel(target === 'inicio' ? inicio : fim)}</Text>
                  <MaterialIcons name="event" size={18} color={fin.sub} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Atletas */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <FieldLabel fin={fin}>{`Atletas${selectedAtletaIds.size > 0 ? ` (${selectedAtletaIds.size})` : ''}`}</FieldLabel>
            <Pressable onPress={showIsentos} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="block" size={15} color={fin.brand} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: fin.brand }}>Mostrar isentos</Text>
            </Pressable>
          </View>

          {athletes.length === 0 ? (
            <Text style={{ color: fin.sub, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 30 }}>Nenhum atleta encontrado</Text>
          ) : (
            <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
              {athletes.map((a, i) => {
                const nome = a.atleta.surname?.trim() || a.atleta.name;
                const color = a.team?.color ?? fin.brand;
                const sel = selectedAtletaIds.has(a.atleta.id);
                return (
                  <Pressable
                    key={a.atleta.id}
                    onPress={() => toggleAtleta(a.atleta.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 13, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: fin.line }}
                  >
                    <Avatar name={nome} color={color} size={36} fontSize={13} fin={fin} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: fin.ink }}>{nome}</Text>
                      <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 1 }}>{a.team?.name ?? ''}</Text>
                    </View>
                    <View style={{
                      width: 24, height: 24, borderRadius: 7,
                      borderWidth: 2, borderColor: sel ? fin.brand : fin.line,
                      backgroundColor: sel ? fin.brand : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <MaterialIcons name="check" size={16} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      {!loading && athletes.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 12, backgroundColor: fin.surface, borderTopWidth: 1, borderTopColor: fin.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
          <PillButton label="Remover isenção" variant="outlined" fin={fin} onPress={() => apply(false)} disabled={saving} style={{ flex: 1 }} />
          <PillButton label="Isentar" icon="block" fin={fin} onPress={() => apply(true)} loading={saving} style={{ flex: 1 }} />
        </View>
      )}

      {/* Month picker */}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)}>
          <Dialog.Title>{pickerTarget === 'inicio' ? 'Mês inicial' : 'Mês final'}</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Pressable onPress={() => setPickerYear(y => y - 1)} hitSlop={8}><MaterialIcons name="chevron-left" size={22} color={fin.sub} /></Pressable>
              <Text style={{ minWidth: 60, textAlign: 'center', fontSize: 18, fontWeight: '700', color: fin.ink }}>{pickerYear}</Text>
              <Pressable onPress={() => setPickerYear(y => y + 1)} hitSlop={8}><MaterialIcons name="chevron-right" size={22} color={fin.sub} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MONTHS.map((m, i) => {
                const target = pickerTarget === 'inicio' ? inicio : fim;
                const isSelected = pickerYear === target.getFullYear() && i === target.getMonth();
                return (
                  <Pressable
                    key={i}
                    onPress={() => pickMonth(i)}
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

      {/* Isentos */}
      <Portal>
        <Dialog visible={isentosVisible} onDismiss={() => setIsentosVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>Atletas isentos</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            {isentosLoading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color={fin.brand} />
            ) : isentos.length === 0 ? (
              <Text style={{ color: fin.sub, fontWeight: '600', textAlign: 'center', paddingVertical: 30 }}>Nenhum atleta isento</Text>
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 4 }}>
                {isentos.map((it, i) => {
                  const nome = it.atleta.surname?.trim() || it.atleta.name;
                  const color = it.team?.color ?? fin.brand;
                  return (
                    <View key={it.atleta.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: fin.line }}>
                      <Avatar name={nome} color={color} size={36} fontSize={13} fin={fin} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: fin.ink }}>{nome}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                          {formatRanges(it.meses).map((r, j) => (
                            <View key={j} style={{ backgroundColor: fin.track, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: fin.sub }}>{r}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Pressable onPress={() => setIsentosVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
