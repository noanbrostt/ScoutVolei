import { View, ScrollView, Alert, Share, TouchableOpacity } from 'react-native';
import { Text, Checkbox, Button, Appbar, useTheme, Divider, Chip, Portal, Dialog, TextInput, IconButton } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system/next';
import { playerService } from '../../../src/services/playerService';
import { teamService } from '../../../src/services/teamService';

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

export default function ExportTeam() {
  const router = useRouter();
  const theme = useTheme();
  const { teamId } = useLocalSearchParams();

  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [includeNumber, setIncludeNumber] = useState(false);
  const [includeRG, setIncludeRG] = useState(false);
  const [includeCPF, setIncludeCPF] = useState(false);
  const [includeBirthday, setIncludeBirthday] = useState(false);

  // Extra players from other teams
  const [extraPlayers, setExtraPlayers] = useState<ExportItem[]>([]);

  // Guest people (not in DB)
  const [guestPeople, setGuestPeople] = useState<ExportItem[]>([]);

  // Team picker dialog
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);

  // Player picker dialog
  const [playerPickerVisible, setPlayerPickerVisible] = useState(false);
  const [pickedTeam, setPickedTeam] = useState<any>(null);
  const [pickedTeamPlayers, setPickedTeamPlayers] = useState<any[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  // Guest dialog
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
        setLoading(false);
      }
    };
    loadData();
  }, [teamId]);

  const toggleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map(p => p.id));
    }
  };

  const togglePlayer = (id: string) => {
    if (selectedPlayers.includes(id)) {
      setSelectedPlayers(selectedPlayers.filter(pid => pid !== id));
    } else {
      setSelectedPlayers([...selectedPlayers, id]);
    }
  };

  // --- Other-team player picker ---

  const handleTeamSelect = async (tm: any) => {
    setTeamPickerVisible(false);
    const p = await playerService.getByTeamId(tm.id);
    setPickedTeam(tm);
    setPickedTeamPlayers(p.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    const alreadyAdded = extraPlayers.filter(ep => ep._label === tm.name).map(ep => ep.id);
    setSelectedExtraIds(alreadyAdded);
    setPlayerPickerVisible(true);
  };

  const toggleExtraId = (id: string) => {
    setSelectedExtraIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmExtraPlayers = () => {
    const kept = extraPlayers.filter(ep => ep._label !== pickedTeam?.name);
    const added = pickedTeamPlayers
      .filter(p => selectedExtraIds.includes(p.id))
      .map(p => ({ ...p, _label: pickedTeam?.name }));
    setExtraPlayers([...kept, ...added]);
    setPlayerPickerVisible(false);
  };

  const removeExtraPlayer = (id: string) => {
    setExtraPlayers(prev => prev.filter(p => p.id !== id));
  };

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

  // --- Guest people ---

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    const guest: ExportItem = {
      id: `guest_${Date.now()}`,
      name: guestName.trim(),
      rg: guestRG.trim() || undefined,
      cpf: guestCPF.trim() || undefined,
      _label: 'Avulso',
    };
    setGuestPeople(prev => [...prev, guest]);
    setGuestName('');
    setGuestRG('');
    setGuestCPF('');
    setGuestDialogVisible(false);
  };

  const removeGuest = (id: string) => {
    setGuestPeople(prev => prev.filter(g => g.id !== id));
  };

  // --- Export ---

  const getExportData = (): ExportItem[] => {
    const main = players
      .filter(p => selectedPlayers.includes(p.id))
      .map(p => ({ ...p, _label: team?.name }));
    return [...main, ...extraPlayers, ...guestPeople]
      .sort((a, b) => a.name.localeCompare(b.name));
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
    const text = generateText();
    try {
      await Share.share({ message: text, title: `Lista - ${team?.name}` });
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

    const rows = data.map((p, i) => {
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          ${includeNumber ? `<td>${p.number ?? '-'}</td>` : ''}
          ${includeRG ? `<td>${p.rg ?? '-'}</td>` : ''}
          ${includeCPF ? `<td>${p.cpf ?? '-'}</td>` : ''}
          ${includeBirthday ? `<td>${p.birthday ?? '-'}</td>` : ''}
        </tr>`;
    }).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { color: ${team?.color || '#000'}; margin-bottom: 4px; }
            .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Lista de Atletas (${data.length})</h1>
          <table>
            <thead>
              <tr><th>#</th><th>Nome</th>${extraCols}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;

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

  const chipStyle = (active: boolean) => ({
    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
    borderColor: active ? theme.colors.primary : 'transparent',
    borderWidth: 1 as const,
  });
  const chipTextStyle = (active: boolean) => ({
    color: active ? '#FFF' : theme.colors.onSurfaceVariant,
    fontWeight: (active ? 'bold' : 'normal') as any,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Exportar Time" />
      </Appbar.Header>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* Options */}
        <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Dados para incluir:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Camisa', value: includeNumber, setter: setIncludeNumber },
            { label: 'RG', value: includeRG, setter: setIncludeRG },
            { label: 'CPF', value: includeCPF, setter: setIncludeCPF },
            { label: 'Nascimento', value: includeBirthday, setter: setIncludeBirthday },
          ].map(opt => (
            <Chip
              key={opt.label}
              selected={opt.value}
              showSelectedOverlay={false}
              icon={() => null}
              onPress={() => opt.setter(!opt.value)}
              style={chipStyle(opt.value)}
              textStyle={chipTextStyle(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </View>

        <Divider style={{ marginBottom: 16 }} />

        {/* Main team players */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {team?.name ?? 'Jogadores'} ({selectedPlayers.length}/{players.length})
          </Text>
          <Button compact mode="text" onPress={toggleSelectAll}>
            {selectedPlayers.length === players.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
        </View>

        {players.map(player => (
          <Checkbox.Item
            key={player.id}
            label={player.surname ? `${player.surname} (${player.name})` : player.name}
            status={selectedPlayers.includes(player.id) ? 'checked' : 'unchecked'}
            onPress={() => togglePlayer(player.id)}
            position="leading"
            labelStyle={{ textAlign: 'left' }}
            style={{ paddingVertical: 0 }}
          />
        ))}

        <Divider style={{ marginVertical: 16 }} />

        {/* Players from other teams */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            De outros times {extraPlayers.length > 0 ? `(${extraPlayers.length})` : ''}
          </Text>
          <Button compact mode="outlined" icon="account-multiple-plus" onPress={() => setTeamPickerVisible(true)}>
            Adicionar
          </Button>
        </View>

        {extraPlayers.length === 0 && (
          <Text variant="bodySmall" style={{ opacity: 0.5, marginBottom: 8 }}>
            Nenhum visitante de outro time adicionado.
          </Text>
        )}
        {extraPlayers.map(p => (
          <View key={p.id} style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 6, paddingLeft: 8,
            borderRadius: 8, marginBottom: 4,
            backgroundColor: theme.colors.elevation.level1,
          }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                {p.name}
              </Text>
            </View>
            <IconButton icon="close" size={18} onPress={() => removeExtraPlayer(p.id)} />
          </View>
        ))}

        <Divider style={{ marginVertical: 16 }} />

        {/* Guest people */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            Visitantes avulsos {guestPeople.length > 0 ? `(${guestPeople.length})` : ''}
          </Text>
          <Button compact mode="outlined" icon="account-plus" onPress={() => setGuestDialogVisible(true)}>
            Adicionar
          </Button>
        </View>

        {guestPeople.length === 0 && (
          <Text variant="bodySmall" style={{ opacity: 0.5, marginBottom: 8 }}>
            Nenhum visitante avulso adicionado.
          </Text>
        )}
        {guestPeople.map(g => (
          <View key={g.id} style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 6, paddingLeft: 8,
            borderRadius: 8, marginBottom: 4,
            backgroundColor: theme.colors.elevation.level1,
          }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{g.name}</Text>
              {(g.rg || g.cpf) && (
                <Text variant="bodySmall" style={{ opacity: 0.55 }}>
                  {[g.rg && `RG: ${g.rg}`, g.cpf && `CPF: ${g.cpf}`].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            <IconButton icon="close" size={18} onPress={() => removeGuest(g.id)} />
          </View>
        ))}

      </ScrollView>

      {/* Bottom Actions */}
      <View style={{
        padding: 16, borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceVariant,
        backgroundColor: theme.colors.surface,
        elevation: 4,
      }}>
        <Text variant="bodySmall" style={{ opacity: 0.6, textAlign: 'center', marginBottom: 10 }}>
          {totalCount} pessoa{totalCount !== 1 ? 's' : ''} na lista
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            mode="outlined"
            icon="whatsapp"
            onPress={handleShareText}
            style={{ flex: 1 }}
            disabled={totalCount === 0}
          >
            Texto
          </Button>
          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={handleGeneratePDF}
            style={{ flex: 1 }}
            disabled={totalCount === 0}
          >
            PDF
          </Button>
        </View>
      </View>

      {/* Team picker dialog */}
      <Portal>
        <Dialog visible={teamPickerVisible} onDismiss={() => setTeamPickerVisible(false)}>
          <Dialog.Title>Selecionar time</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 320, paddingHorizontal: 0 }}>
            <ScrollView>
              {allTeams.length === 0 && (
                <Text variant="bodyMedium" style={{ padding: 24, opacity: 0.6 }}>
                  Nenhum outro time cadastrado.
                </Text>
              )}
              {allTeams.map(tm => (
                <TouchableOpacity
                  key={tm.id}
                  onPress={() => handleTeamSelect(tm)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 24,
                    borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
                  }}
                >
                  <View style={{
                    width: 12, height: 12, borderRadius: 6,
                    backgroundColor: tm.color ?? theme.colors.primary,
                    marginRight: 12,
                  }} />
                  <Text variant="bodyMedium">{tm.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setTeamPickerVisible(false)}>Cancelar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Player picker dialog */}
      <Portal>
        <Dialog visible={playerPickerVisible} onDismiss={() => setPlayerPickerVisible(false)}>
          <Dialog.Title>{pickedTeam?.name}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 360, paddingHorizontal: 0 }}>
            <ScrollView>
              {pickedTeamPlayers.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => toggleExtraId(p.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 12, paddingHorizontal: 16,
                    borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
                  }}
                >
                  <Checkbox
                    status={selectedExtraIds.includes(p.id) ? 'checked' : 'unchecked'}
                    onPress={() => toggleExtraId(p.id)}
                  />
                  <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                    {p.surname ? `${p.surname} (${p.name})` : p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPlayerPickerVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleConfirmExtraPlayers}>
              Confirmar ({selectedExtraIds.length})
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Guest add dialog */}
      <Portal>
        <Dialog visible={guestDialogVisible} onDismiss={() => setGuestDialogVisible(false)}>
          <Dialog.Title>Visitante avulso</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Nome *"
              value={guestName}
              onChangeText={setGuestName}
              mode="outlined"
              autoFocus
            />
            <TextInput
              label="RG (opcional)"
              value={guestRG}
              onChangeText={v => setGuestRG(maskRG(v))}
              mode="outlined"
              keyboardType="numeric"
            />
            <TextInput
              label="CPF (opcional)"
              value={guestCPF}
              onChangeText={v => setGuestCPF(maskCPF(v))}
              mode="outlined"
              keyboardType="numeric"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGuestDialogVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleAddGuest} disabled={!guestName.trim()}>
              Adicionar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
