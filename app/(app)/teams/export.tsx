import { View, ScrollView, Alert, Share, Pressable } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system/next';
import { playerService } from '../../../src/services/playerService';
import { teamService } from '../../../src/services/teamService';
import { useFin } from '../../../src/theme';
import { ScreenHeader, FieldLabel, FieldPill, PillButton, cardShadow } from '../../../src/components/ui';
import { FinTokens } from '../../../src/theme';

type ExportItem = {
  id: string;
  name: string;
  surname?: string;
  number?: string;
  rg?: string;
  cpf?: string;
  birthday?: string;
  _label?: string;
};

// 24px check box
function Check({ on, fin }: { on: boolean; fin: FinTokens }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? fin.brand : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: fin.line }}>
      {on && <MaterialIcons name="check" size={17} color="#fff" />}
    </View>
  );
}

export default function ExportTeam() {
  const router = useRouter();
  const fin = useFin();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams();

  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [includeNumber, setIncludeNumber] = useState(false);
  const [includeRG, setIncludeRG] = useState(false);
  const [includeCPF, setIncludeCPF] = useState(false);
  const [includeBirthday, setIncludeBirthday] = useState(false);

  const [extraPlayers, setExtraPlayers] = useState<ExportItem[]>([]);
  const [guestPeople, setGuestPeople] = useState<ExportItem[]>([]);

  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [playerPickerVisible, setPlayerPickerVisible] = useState(false);
  const [pickedTeam, setPickedTeam] = useState<any>(null);
  const [pickedTeamPlayers, setPickedTeamPlayers] = useState<any[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  const [guestDialogVisible, setGuestDialogVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestRG, setGuestRG] = useState('');
  const [guestCPF, setGuestCPF] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (typeof teamId === 'string') {
        const [t, p, teams] = await Promise.all([
          teamService.getById(teamId),
          playerService.getByTeamId(teamId),
          teamService.getAll(),
        ]);
        const sorted = p.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setTeam(t);
        setPlayers(sorted);
        setAllTeams((teams as any[]).filter((tm: any) => tm.id !== teamId));
        setSelectedPlayers(sorted.map((pl: any) => pl.id));
      }
    };
    loadData();
  }, [teamId]);

  const toggleSelectAll = () => {
    setSelectedPlayers(selectedPlayers.length === players.length ? [] : players.map(p => p.id));
  };
  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const handleTeamSelect = async (tm: any) => {
    setTeamPickerVisible(false);
    const p = await playerService.getByTeamId(tm.id);
    setPickedTeam(tm);
    setPickedTeamPlayers(p.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setSelectedExtraIds(extraPlayers.filter(ep => ep._label === tm.name).map(ep => ep.id));
    setPlayerPickerVisible(true);
  };
  const toggleExtraId = (id: string) => {
    setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleConfirmExtraPlayers = () => {
    const kept = extraPlayers.filter(ep => ep._label !== pickedTeam?.name);
    const added = pickedTeamPlayers.filter(p => selectedExtraIds.includes(p.id)).map(p => ({ ...p, _label: pickedTeam?.name }));
    setExtraPlayers([...kept, ...added]);
    setPlayerPickerVisible(false);
  };
  const removeExtraPlayer = (id: string) => setExtraPlayers(prev => prev.filter(p => p.id !== id));

  const maskRG = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 9);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}-${d.slice(8)}`;
  };
  const maskCPF = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    setGuestPeople(prev => [...prev, {
      id: `guest_${Date.now()}`, name: guestName.trim(),
      rg: guestRG.trim() || undefined, cpf: guestCPF.trim() || undefined, _label: 'Avulso',
    }]);
    setGuestName(''); setGuestRG(''); setGuestCPF('');
    setGuestDialogVisible(false);
  };
  const removeGuest = (id: string) => setGuestPeople(prev => prev.filter(g => g.id !== id));

  const getExportData = (): ExportItem[] => {
    const main = players.filter(p => selectedPlayers.includes(p.id)).map(p => ({ ...p, _label: team?.name }));
    return [...main, ...extraPlayers, ...guestPeople].sort((a, b) => a.name.localeCompare(b.name));
  };
  const totalCount = selectedPlayers.length + extraPlayers.length + guestPeople.length;

  const generateText = () => {
    const data = getExportData();
    let text = `Lista de Atletas (${data.length})\n\n`;
    data.forEach((p, index) => {
      text += `${index + 1}. ${p.name}`;
      if (includeNumber && p.number) text += ` (#${p.number})`;
      if (includeRG && p.rg) text += ` - RG: ${p.rg}`;
      if (includeCPF && p.cpf) text += ` - CPF: ${p.cpf}`;
      if (includeBirthday && p.birthday) text += ` - Nasc: ${p.birthday}`;
      text += '\n';
    });
    return text;
  };
  const handleShareText = async () => {
    try {
      await Share.share({ message: generateText(), title: `Lista - ${team?.name}` });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  };

  const handleGeneratePDF = async () => {
    const data = getExportData();
    const extraCols = [
      includeNumber ? '<th>Camisa</th>' : '',
      includeRG ? '<th>RG</th>' : '',
      includeCPF ? '<th>CPF</th>' : '',
      includeBirthday ? '<th>Nascimento</th>' : '',
    ].join('');
    const rows = data.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          ${includeNumber ? `<td>${p.number ?? '-'}</td>` : ''}
          ${includeRG ? `<td>${p.rg ?? '-'}</td>` : ''}
          ${includeCPF ? `<td>${p.cpf ?? '-'}</td>` : ''}
          ${includeBirthday ? `<td>${p.birthday ?? '-'}</td>` : ''}
        </tr>`).join('');
    const html = `
      <html><head><style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
        h1 { color: ${team?.color || '#000'}; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background-color: #f2f2f2; }
      </style></head>
      <body>
        <h1>Lista de Atletas (${data.length})</h1>
        <table><thead><tr><th>#</th><th>Nome</th>${extraCols}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const src = new File(uri);
      const suffix = Math.random().toString(16).slice(2, 8);
      const dest = new File(Paths.cache, `lista_de_atletas_${suffix}.pdf`);
      src.copy(dest);
      await Sharing.shareAsync(dest.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
      console.error(error);
    }
  };

  const sectionTitle = (txt: string) => (
    <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub }}>{txt}</Text>
  );

  const AddButton = ({ icon, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: fin.brand, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 }}>
      <MaterialIcons name={icon} size={16} color={fin.brand} />
      <Text style={{ color: fin.brand, fontWeight: '700', fontSize: 13 }}>Adicionar</Text>
    </Pressable>
  );

  const INCLUDE_OPTS = [
    { label: 'Camisa', value: includeNumber, setter: setIncludeNumber },
    { label: 'RG', value: includeRG, setter: setIncludeRG },
    { label: 'CPF', value: includeCPF, setter: setIncludeCPF },
    { label: 'Nascimento', value: includeBirthday, setter: setIncludeBirthday },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader title="Exportar time" onBack={() => router.back()} fin={fin} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>
        {/* Include options */}
        <FieldLabel fin={fin}>Dados para incluir</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {INCLUDE_OPTS.map(opt => (
            <Pressable
              key={opt.label}
              onPress={() => opt.setter(!opt.value)}
              style={{ borderWidth: 1.5, borderColor: opt.value ? fin.brand : fin.line, backgroundColor: opt.value ? fin.brand : 'transparent', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: opt.value ? '#fff' : fin.sub }}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Main team players */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          {sectionTitle(`${team?.name ?? 'Jogadores'} (${selectedPlayers.length}/${players.length})`)}
          <Pressable onPress={toggleSelectAll} hitSlop={6}>
            <Text style={{ color: fin.brand, fontWeight: '700', fontSize: 13 }}>
              {selectedPlayers.length === players.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Text>
          </Pressable>
        </View>
        <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
          {players.map((player, i) => {
            const on = selectedPlayers.includes(player.id);
            return (
              <Pressable
                key={player.id}
                onPress={() => togglePlayer(player.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 13, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}
              >
                <Check on={on} fin={fin} />
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '700', color: on ? fin.ink : fin.sub }}>
                  {player.surname ? `${player.surname} (${player.name})` : player.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* From other teams */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }}>
          {sectionTitle(`De outros times ${extraPlayers.length > 0 ? `(${extraPlayers.length})` : ''}`)}
          <AddButton icon="group-add" onPress={() => setTeamPickerVisible(true)} />
        </View>
        {extraPlayers.length === 0 ? (
          <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', opacity: 0.7 }}>Nenhum visitante de outro time adicionado.</Text>
        ) : (
          <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
            {extraPlayers.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 6, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: fin.ink }}>{p.name}</Text>
                <Pressable onPress={() => removeExtraPlayer(p.id)} hitSlop={6} style={{ padding: 6 }}>
                  <MaterialIcons name="close" size={18} color={fin.sub} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Guests */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }}>
          {sectionTitle(`Visitantes avulsos ${guestPeople.length > 0 ? `(${guestPeople.length})` : ''}`)}
          <AddButton icon="person-add" onPress={() => setGuestDialogVisible(true)} />
        </View>
        {guestPeople.length === 0 ? (
          <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', opacity: 0.7 }}>Nenhum visitante avulso adicionado.</Text>
        ) : (
          <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
            {guestPeople.map((g, i) => (
              <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 6, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: fin.ink }}>{g.name}</Text>
                  {(g.rg || g.cpf) && (
                    <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600' }}>
                      {[g.rg && `RG: ${g.rg}`, g.cpf && `CPF: ${g.cpf}`].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => removeGuest(g.id)} hitSlop={6} style={{ padding: 6 }}>
                  <MaterialIcons name="close" size={18} color={fin.sub} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: fin.line, backgroundColor: fin.surface }}>
        <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', textAlign: 'center', marginBottom: 10 }}>
          {totalCount} pessoa{totalCount !== 1 ? 's' : ''} na lista
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PillButton label="Texto" icon="chat" variant="outlined" fin={fin} onPress={handleShareText} disabled={totalCount === 0} style={{ flex: 1 }} />
          <PillButton label="PDF" icon="picture-as-pdf" variant="primary" fin={fin} onPress={handleGeneratePDF} disabled={totalCount === 0} style={{ flex: 1 }} />
        </View>
      </View>

      {/* Team picker dialog */}
      <Portal>
        <Dialog visible={teamPickerVisible} onDismiss={() => setTeamPickerVisible(false)}>
          <Dialog.Title>Selecionar time</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView style={{ maxHeight: 320 }}>
              {allTeams.length === 0 && (
                <Text style={{ padding: 24, color: fin.sub, fontWeight: '600' }}>Nenhum outro time cadastrado.</Text>
              )}
              {allTeams.map(tm => (
                <Pressable
                  key={tm.id}
                  onPress={() => handleTeamSelect(tm)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: fin.line }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tm.color ?? fin.brand }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: fin.ink }}>{tm.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Pressable onPress={() => setTeamPickerVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Player picker dialog */}
      <Portal>
        <Dialog visible={playerPickerVisible} onDismiss={() => setPlayerPickerVisible(false)}>
          <Dialog.Title>{pickedTeam?.name}</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickedTeamPlayers.map((p, i) => {
                const on = selectedExtraIds.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => toggleExtraId(p.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}
                  >
                    <Check on={on} fin={fin} />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: on ? fin.ink : fin.sub }}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Pressable onPress={() => setPlayerPickerVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.sub, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleConfirmExtraPlayers} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '800' }}>Confirmar ({selectedExtraIds.length})</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Guest add dialog */}
      <Portal>
        <Dialog visible={guestDialogVisible} onDismiss={() => setGuestDialogVisible(false)}>
          <Dialog.Title>Visitante avulso</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <View>
              <FieldLabel fin={fin}>Nome *</FieldLabel>
              <FieldPill fin={fin} value={guestName} onChangeText={setGuestName} placeholder="Nome completo" autoFocus />
            </View>
            <View>
              <FieldLabel fin={fin}>RG (opcional)</FieldLabel>
              <FieldPill fin={fin} value={guestRG} onChangeText={v => setGuestRG(maskRG(v))} keyboardType="numeric" placeholder="00.000.000-0" />
            </View>
            <View>
              <FieldLabel fin={fin}>CPF (opcional)</FieldLabel>
              <FieldPill fin={fin} value={guestCPF} onChangeText={v => setGuestCPF(maskCPF(v))} keyboardType="numeric" placeholder="000.000.000-00" />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable onPress={() => setGuestDialogVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.sub, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleAddGuest} disabled={!guestName.trim()} style={{ paddingVertical: 8, paddingHorizontal: 16, opacity: guestName.trim() ? 1 : 0.5 }}>
              <Text style={{ color: fin.brand, fontWeight: '800' }}>Adicionar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
