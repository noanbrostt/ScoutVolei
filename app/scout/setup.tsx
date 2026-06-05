import { View, ScrollView, Alert, Pressable } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { teamService } from '../../src/services/teamService';
import { playerService } from '../../src/services/playerService';
import { matchService } from '../../src/services/matchService';
import { syncService } from '../../src/services/syncService';
import { useFin, FinTokens } from '../../src/theme';
import { ScreenHeader, FieldLabel, FieldPill, PillButton, cardShadow, Avatar } from '../../src/components/ui';

const MIN_PLAYERS = 6;
const MAX_PLAYERS = 7;

function Check({ on, fin }: { on: boolean; fin: FinTokens }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? fin.brand : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: fin.line }}>
      {on && <MaterialIcons name="check" size={17} color="#fff" />}
    </View>
  );
}

export default function ScoutSetup() {
  const router = useRouter();
  const fin = useFin();
  const insets = useSafeAreaInsets();

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');

  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { teamService.getAll().then(setTeams); }, []);

  useEffect(() => {
    if (selectedTeam) {
      playerService.getByTeamId(selectedTeam.id).then(players => {
        const sorted = players.sort((a: any, b: any) => (a.surname || a.name).localeCompare(b.surname || b.name));
        setTeamPlayers(sorted);
        setSelectedPlayerIds([]);
      });
    } else {
      setTeamPlayers([]);
      setSelectedPlayerIds([]);
    }
  }, [selectedTeam]);

  const togglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    } else {
      if (selectedPlayerIds.length >= MAX_PLAYERS) {
        Alert.alert('Limite atingido', `Você pode selecionar no máximo ${MAX_PLAYERS} jogadores.`);
        return;
      }
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const canStart = !!selectedTeam && selectedPlayerIds.length >= MIN_PLAYERS;

  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    try {
      const match = await matchService.create(selectedTeam.id, opponent.trim() || 'Adversário', location);
      syncService.triggerSync();
      router.replace({
        pathname: `/scout/${match.id}`,
        params: { initialLineup: JSON.stringify(selectedPlayerIds) },
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao criar partida.');
    } finally {
      setLoading(false);
    }
  };

  const sectionTitle = (txt: string, count?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: fin.ink, letterSpacing: -0.2 }}>{txt}</Text>
      {count != null && <Text style={{ fontSize: 13, fontWeight: '700', color: fin.brand }}>{count}</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader title="Nova partida" onBack={() => router.back()} fin={fin} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Dados do jogo */}
        {sectionTitle('Dados do jogo')}

        <View style={{ marginBottom: 16 }}>
          <FieldLabel fin={fin}>Meu time *</FieldLabel>
          <Pressable
            onPress={() => setTeamModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fin.field, borderWidth: 1.5, borderColor: fin.line, borderRadius: 12, paddingHorizontal: 13, height: 48 }}
          >
            {selectedTeam && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedTeam.color ?? fin.brand }} />}
            <Text style={{ flex: 1, fontSize: 15.5, fontWeight: selectedTeam ? '700' : '600', color: selectedTeam ? fin.ink : fin.sub }}>
              {selectedTeam ? selectedTeam.name : 'Selecionar time'}
            </Text>
            <MaterialIcons name="expand-more" size={22} color={fin.sub} />
          </Pressable>
        </View>

        <View style={{ marginBottom: 16 }}>
          <FieldLabel fin={fin}>Adversário</FieldLabel>
          <FieldPill fin={fin} value={opponent} onChangeText={setOpponent} placeholder="Nome do adversário" />
        </View>

        <View style={{ marginBottom: 20 }}>
          <FieldLabel fin={fin}>Local</FieldLabel>
          <FieldPill fin={fin} value={location} onChangeText={setLocation} placeholder="Ginásio / campeonato" />
        </View>

        {/* Escalação inicial */}
        {sectionTitle('Escalação inicial', selectedTeam ? `${selectedPlayerIds.length} de ${MIN_PLAYERS}–${MAX_PLAYERS}` : undefined)}

        {!selectedTeam ? (
          <View style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 18, ...cardShadow(fin) }}>
            <Text style={{ color: fin.sub, fontWeight: '600', textAlign: 'center' }}>Selecione um time para escalar os atletas.</Text>
          </View>
        ) : teamPlayers.length === 0 ? (
          <View style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 18, ...cardShadow(fin) }}>
            <Text style={{ color: fin.sub, fontWeight: '600', textAlign: 'center' }}>Este time não tem atletas cadastrados.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: fin.surface, borderRadius: 14, overflow: 'hidden', ...cardShadow(fin) }}>
            {teamPlayers.map((p, i) => {
              const on = selectedPlayerIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => togglePlayer(p.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 13, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}
                >
                  <Avatar name={p.surname || p.name} color={selectedTeam.color ?? fin.brand} size={36} fontSize={13} muted={!on} fin={fin} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 15, color: on ? fin.ink : fin.sub }}>{p.surname || p.name}</Text>
                    {p.position && <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', marginTop: 1 }}>{p.position}</Text>}
                  </View>
                  <Check on={on} fin={fin} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(12, insets.bottom + 10), borderTopWidth: 1, borderTopColor: fin.line, backgroundColor: fin.surface }}>
        {selectedTeam && selectedPlayerIds.length < MIN_PLAYERS && (
          <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', textAlign: 'center', marginBottom: 10 }}>
            Selecione ao menos {MIN_PLAYERS} atletas para iniciar.
          </Text>
        )}
        <PillButton label="Iniciar partida" icon="play-arrow" fin={fin} onPress={handleStart} loading={loading} disabled={!canStart} />
      </View>

      {/* Team picker dialog */}
      <Portal>
        <Dialog visible={teamModalVisible} onDismiss={() => setTeamModalVisible(false)}>
          <Dialog.Title>Selecionar time</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView style={{ maxHeight: 360 }}>
              {teams.map((t, i) => {
                const sel = selectedTeam?.id === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => { setSelectedTeam(t); setTeamModalVisible(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 24, borderTopWidth: i ? 1 : 0, borderTopColor: fin.line }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.color ?? fin.brand }} />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: sel ? fin.brand : fin.ink }}>{t.name}</Text>
                    {sel && <MaterialIcons name="check" size={20} color={fin.brand} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Pressable onPress={() => setTeamModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
