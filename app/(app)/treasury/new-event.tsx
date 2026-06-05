import { View, ScrollView, Platform, Pressable, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { teamService } from '../../../src/services/teamService';
import { playerService } from '../../../src/services/playerService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { money, toIsoDate, formatDateBR, Avatar } from '../../../src/components/treasury/finance-ui';
import { FinTokens } from '../../../src/theme';

const PARCELA_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const parcLabel = (n: number) => (n === 1 ? 'À vista' : `${n}x`);

type RosterAthlete = { atletaId: string; nome: string; teamId: string; teamColor: string; teamName: string };

function Label({ fin, children, hint }: { fin: FinTokens; children: string; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub }}>{children}</Text>
      {hint && <Text style={{ fontSize: 11.5, color: fin.sub, fontWeight: '500', opacity: 0.8 }}>{hint}</Text>}
    </View>
  );
}

export default function NewEvent() {
  const fin = useFin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [roster, setRoster] = useState<RosterAthlete[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'amistoso' | 'campeonato'>('amistoso');
  const [valor, setValor] = useState('');
  const [defaultParcelas, setDefaultParcelas] = useState(1);

  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showInicioPicker, setShowInicioPicker] = useState(false);
  const [showFimPicker, setShowFimPicker] = useState(false);

  const [openDefault, setOpenDefault] = useState(false);
  const [openAth, setOpenAth] = useState<string | null>(null);
  const [nomeFocus, setNomeFocus] = useState(false);
  const [valorFocus, setValorFocus] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    teamService.getAll().then((teams: any[]) => {
      setAllTeams(teams);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      if (selectedTeamIds.size === 0) { setRoster([]); return; }
      const teams = allTeams.filter(t => selectedTeamIds.has(t.id));
      const all: RosterAthlete[] = [];
      for (const team of teams) {
        const athletes = await playerService.getByTeamId(team.id);
        for (const a of athletes) {
          all.push({
            atletaId: a.id,
            nome: a.surname?.trim() || a.name,
            teamId: team.id,
            teamColor: team.color,
            teamName: team.name,
          });
        }
      }
      all.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setRoster(all);
    };
    load();
  }, [selectedTeamIds, allTeams]);

  const included = roster.filter(a => !excluded.has(a.atletaId));
  const valorNum = parseFloat((valor || '').replace(',', '.')) || 0;
  const esperado = included.length * valorNum;
  const canSave = !!nome.trim() && valorNum > 0 && included.length > 0;

  const accent = tipo === 'campeonato' ? fin.campeonato : fin.amistoso;
  const athParc = (id: string) => overrides[id] ?? defaultParcelas;

  const toggleTeam = (id: string) =>
    setSelectedTeamIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAth = (id: string) =>
    setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setAthParc = (id: string, n: number) => {
    setOverrides(prev => ({ ...prev, [id]: n }));
    setOpenAth(null);
  };
  const applyDefault = (n: number) => {
    setDefaultParcelas(n);
    setOverrides({});
    setOpenDefault(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await treasuryService.createEvent({
        nome: nome.trim(),
        tipo,
        teamIds: [...selectedTeamIds],
        dataInicio: toIsoDate(dataInicio),
        dataFim: dataFim ? toIsoDate(dataFim) : null,
        valorPorAtleta: valorNum,
        atletasParcelas: included.map(a => {
          const total = athParc(a.atletaId);
          return {
            atletaId: a.atletaId,
            totalParcelas: total,
            valorParcela: parseFloat((valorNum / total).toFixed(2)),
          };
        }),
      });
      syncService.triggerSync();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = (txt: string) => (
    <Text style={{ fontSize: 15, fontWeight: '800', color: fin.ink, letterSpacing: -0.2, marginTop: 4, marginBottom: 12 }}>{txt}</Text>
  );

  const ParcelaOptions = ({ current, onPick }: { current: number; onPick: (n: number) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {PARCELA_OPTIONS.map(opt => {
        const sel = current === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onPick(opt)}
            style={{ borderWidth: 1.5, borderColor: sel ? fin.brand : fin.line, backgroundColor: sel ? fin.brand : 'transparent', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 12 }}
          >
            <Text style={{ fontWeight: '700', fontSize: 12.5, color: sel ? '#fff' : fin.sub }}>{parcLabel(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={fin.ink} />
          </Pressable>
          <Text style={{ fontWeight: '800', fontSize: 19, color: fin.ink, letterSpacing: -0.3 }}>Novo evento</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {sectionTitle('Dados do evento')}

        {/* Nome */}
        <View style={{ marginBottom: 16 }}>
          <Label fin={fin}>Nome</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: fin.field, borderWidth: 1.5, borderColor: nomeFocus ? fin.brand : fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}>
            <TextInput
              value={nome} onChangeText={setNome}
              placeholder="Ex: Copa Verão 2026" placeholderTextColor={fin.sub}
              onFocus={() => setNomeFocus(true)} onBlur={() => setNomeFocus(false)}
              style={{ flex: 1, fontSize: 15.5, fontWeight: '600', color: fin.ink }}
            />
          </View>
        </View>

        {/* Tipo */}
        <View style={{ marginBottom: 16 }}>
          <Label fin={fin}>Tipo</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([['amistoso', 'Amistoso', 'sports-volleyball'], ['campeonato', 'Campeonato', 'emoji-events']] as const).map(([id, lbl, icon]) => {
              const on = tipo === id;
              const ac = id === 'campeonato' ? fin.campeonato : fin.amistoso;
              const soft = id === 'campeonato' ? fin.campeonatoSoft : fin.amistosoSoft;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTipo(id)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: on ? ac : fin.line, backgroundColor: on ? soft : 'transparent', borderRadius: 12, paddingVertical: 11 }}
                >
                  <MaterialIcons name={icon} size={18} color={on ? ac : fin.sub} />
                  <Text style={{ fontWeight: '800', fontSize: 14, color: on ? ac : fin.sub }}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Datas */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label fin={fin}>Início</Label>
            <Pressable
              onPress={() => setShowInicioPicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fin.field, borderWidth: 1.5, borderColor: fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}
            >
              <MaterialIcons name="event" size={18} color={fin.sub} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: fin.ink, fontVariant: ['tabular-nums'] }}>{formatDateBR(dataInicio)}</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label fin={fin} hint="(opcional)">Fim</Label>
            {dataFim ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fin.field, borderWidth: 1.5, borderColor: fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}>
                <MaterialIcons name="event" size={18} color={fin.sub} />
                <Pressable style={{ flex: 1 }} onPress={() => setShowFimPicker(true)}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: fin.ink, fontVariant: ['tabular-nums'] }}>{formatDateBR(dataFim)}</Text>
                </Pressable>
                <Pressable onPress={() => setDataFim(null)} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={fin.sub} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { setDataFim(dataInicio); setShowFimPicker(true); }}
                style={{ height: 48, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: fin.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13.5, color: fin.brand }}>+ Adicionar</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Valor + Parcelas */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: openDefault ? 12 : 20 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label fin={fin}>Valor / atleta</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fin.field, borderWidth: 1.5, borderColor: valorFocus ? fin.brand : fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: fin.sub }}>R$</Text>
              <TextInput
                value={valor} onChangeText={setValor}
                placeholder="0" placeholderTextColor={fin.sub} keyboardType="decimal-pad"
                onFocus={() => setValorFocus(true)} onBlur={() => setValorFocus(false)}
                style={{ flex: 1, fontSize: 15.5, fontWeight: '600', color: fin.ink }}
              />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label fin={fin} hint="(padrão)">Parcelas</Label>
            <Pressable
              onPress={() => setOpenDefault(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: fin.field, borderWidth: 1.5, borderColor: openDefault ? fin.brand : fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}
            >
              <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '700', color: fin.ink }}>{parcLabel(defaultParcelas)}</Text>
              <MaterialIcons name={openDefault ? 'expand-more' : 'chevron-right'} size={20} color={fin.sub} />
            </Pressable>
          </View>
        </View>
        {openDefault && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: fin.sub, fontWeight: '700', marginBottom: 7 }}>Aplicar a todos os atletas</Text>
            <ParcelaOptions current={defaultParcelas} onPick={applyDefault} />
          </View>
        )}

        {/* Atletas */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: fin.ink, letterSpacing: -0.2 }}>Atletas</Text>
          <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '700' }}>{included.length} de {roster.length}</Text>
        </View>

        {/* Team filter */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {allTeams.map(team => {
            const on = selectedTeamIds.has(team.id);
            return (
              <Pressable
                key={team.id}
                onPress={() => toggleTeam(team.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderColor: on ? team.color : fin.line, backgroundColor: on ? team.color : 'transparent', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13 }}
              >
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: on ? '#fff' : team.color }} />
                <Text style={{ fontWeight: '700', fontSize: 13, color: on ? '#fff' : fin.sub }}>{team.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Checklist */}
        <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...(fin.shadow === 'transparent' ? { borderWidth: 1, borderColor: fin.line } : { shadowColor: '#14213B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }) }}>
          {roster.map((a, i) => {
            const on = !excluded.has(a.atletaId);
            const n = athParc(a.atletaId);
            const custom = overrides[a.atletaId] != null && overrides[a.atletaId] !== defaultParcelas;
            const isOpen = openAth === a.atletaId;
            return (
              <View key={a.atletaId} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 13 }}>
                  <Pressable onPress={() => toggleAth(a.atletaId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
                    <Avatar name={a.nome} color={a.teamColor} size={36} fontSize={13} muted={!on} fin={fin} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: on ? fin.ink : fin.sub }}>{a.nome}</Text>
                      <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 1 }}>{a.teamName}</Text>
                    </View>
                  </Pressable>

                  {on && (
                    <Pressable
                      onPress={() => setOpenAth(isOpen ? null : a.atletaId)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1.5, borderColor: custom || isOpen ? fin.brand : fin.line, backgroundColor: custom ? fin.brandSoft : 'transparent', borderRadius: 9, paddingVertical: 5, paddingHorizontal: 9 }}
                    >
                      <Text style={{ fontWeight: '800', fontSize: 12.5, color: custom || isOpen ? fin.brand : fin.sub }}>{parcLabel(n)}</Text>
                      <MaterialIcons name={isOpen ? 'expand-more' : 'chevron-right'} size={14} color={custom || isOpen ? fin.brand : fin.sub} />
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => toggleAth(a.atletaId)}
                    style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? fin.brand : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: fin.line }}
                  >
                    {on && <MaterialIcons name="check" size={17} color="#fff" />}
                  </Pressable>
                </View>

                {on && isOpen && (
                  <View style={{ paddingLeft: 60, paddingRight: 13, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: fin.sub, fontWeight: '700', marginBottom: 7 }}>Parcelas de {a.nome}</Text>
                    <ParcelaOptions current={n} onPick={(opt) => setAthParc(a.atletaId, opt)} />
                  </View>
                )}
              </View>
            );
          })}
          {roster.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: fin.sub, fontWeight: '600' }}>Selecione ao menos um time</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date pickers */}
      {showInicioPicker && (
        <DateTimePicker
          value={dataInicio} mode="date" display="default"
          onChange={(_, date) => { setShowInicioPicker(Platform.OS === 'ios'); if (date) setDataInicio(date); }}
        />
      )}
      {showFimPicker && (
        <DateTimePicker
          value={dataFim ?? dataInicio} mode="date" display="default" minimumDate={dataInicio}
          onChange={(e, date) => {
            setShowFimPicker(Platform.OS === 'ios');
            if (e.type === 'dismissed') return;
            if (date) setDataFim(date);
          }}
        />
      )}

      {/* Fixed footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fin.surface, borderTopWidth: 1, borderTopColor: fin.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: fin.ink, fontVariant: ['tabular-nums'] }}>{money(esperado)}</Text>
          <Text style={{ fontSize: 11.5, color: fin.sub, fontWeight: '600', marginTop: 2 }}>{included.length} atletas · {parcLabel(defaultParcelas)}</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={{ backgroundColor: canSave ? fin.brand : fin.disabled, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{saving ? '...' : 'Criar evento'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
