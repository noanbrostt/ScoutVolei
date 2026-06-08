import { View, FlatList, Alert, Pressable } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { teamService } from '../../../src/services/teamService';
import { playerService } from '../../../src/services/playerService';
import { useAuthStore } from '../../../src/store/authStore';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { ScreenHeader, cardShadow, Avatar } from '../../../src/components/ui';

const POSITIONS = ['Ponteiro', 'Central', 'Oposto', 'Levantador', 'Líbero'];

export default function TeamDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const fin = useFin();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (typeof id === 'string') {
        const t = await teamService.getById(id);
        setTeam(t);
        const p = await playerService.getByTeamId(id);
        setPlayers(p);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  useEffect(() => {
    const unsubscribe = syncService.subscribe(() => { loadData(); });
    return () => unsubscribe();
  }, [id]);

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (selectedPositions.length > 0) {
      result = players.filter(p => selectedPositions.includes(p.position));
    }
    return [...result].sort((a, b) => (a.surname || a.name).localeCompare(b.surname || b.name));
  }, [players, selectedPositions]);

  const togglePositionFilter = (pos: string) => {
    setSelectedPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

  const handleDeletePlayer = (playerId: string) => {
    Alert.alert('Excluir jogador', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await playerService.delete(playerId);
        syncService.triggerSync();
        loadData();
      }},
    ]);
  };

  const handleDeleteTeam = () => {
    Alert.alert('Excluir time', 'Tem certeza? Isso apagará todos os jogadores e dados associados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await teamService.delete(id as string);
        syncService.triggerSync();
        router.back();
      }},
    ]);
  };

  if (!team && !loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: fin.bg }}><Text style={{ color: fin.sub }}>Time não encontrado</Text></View>;
  }

  const isAdmin = user?.role === 'admin';
  const canManagePlayers = user?.role === 'admin' || user?.role === 'financeiro';
  const headerColor = team?.color ?? fin.brand;

  const HeaderAction = ({ icon, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) => (
    <Pressable onPress={onPress} hitSlop={6} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name={icon} size={22} color="#fff" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader
        title={team?.name || 'Detalhes'}
        onBack={() => router.back()}
        fin={fin}
        backgroundColor={headerColor}
        tint="#fff"
        right={isAdmin ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeaderAction icon="share" onPress={() => router.push({ pathname: '/(app)/teams/export', params: { teamId: id } })} />
            <HeaderAction icon="edit" onPress={() => router.push({ pathname: '/(app)/teams/edit', params: { id } })} />
            <HeaderAction icon="delete" onPress={handleDeleteTeam} />
          </View>
        ) : undefined}
      />

      <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: fin.sub, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Atletas ({filteredPlayers.length})
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {selectedPositions.length > 0 && (
              <Pressable onPress={() => setSelectedPositions([])} hitSlop={6} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: fin.brand, fontWeight: '700', fontSize: 13 }}>Limpar</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setFilterVisible(true)}
              hitSlop={6}
              style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedPositions.length > 0 ? fin.brand : fin.eyeBg }}
            >
              <MaterialIcons name="filter-list" size={20} color={selectedPositions.length > 0 ? '#fff' : fin.sub} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={filteredPlayers}
          extraData={fin}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/teams/view-player', params: { playerId: item.id } })}
              disabled={!canManagePlayers}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: fin.surface, borderRadius: 14, padding: 11, marginBottom: 9, ...cardShadow(fin) }}
            >
              <Avatar name={item.surname || item.name} color={team?.color ?? fin.brand} size={40} fontSize={14} fin={fin} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: fin.ink, letterSpacing: -0.2 }}>
                    {item.surname || item.name.split(' ')[0]}
                  </Text>
                  {item.syncStatus === 'pending' && <MaterialIcons name="cloud-upload" size={16} color={fin.warn} />}
                </View>
                {canManagePlayers && (
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', marginTop: 1 }}>{item.name}</Text>
                )}
              </View>
              <View style={{ backgroundColor: fin.field, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: fin.sub }}>{item.position}</Text>
              </View>
              {canManagePlayers && (
                <Pressable onPress={() => router.push({ pathname: '/(app)/teams/edit-player', params: { playerId: item.id } })} hitSlop={6} style={{ padding: 4 }}>
                  <MaterialIcons name="edit" size={20} color={fin.sub} />
                </Pressable>
              )}
              {isAdmin && (
                <Pressable onPress={() => handleDeletePlayer(item.id)} hitSlop={6} style={{ padding: 4 }}>
                  <MaterialIcons name="delete" size={20} color={fin.warn} />
                </Pressable>
              )}
            </Pressable>
          )}
          ListEmptyComponent={!loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: fin.sub, fontWeight: '600' }}>Nenhum atleta encontrado</Text>
            </View>
          ) : null}
        />
      </View>

      {canManagePlayers && (
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/teams/add-player', params: { teamId: id } })}
          style={{
            position: 'absolute', right: 18, bottom: 18,
            flexDirection: 'row', alignItems: 'center', gap: 7,
            backgroundColor: fin.brand, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16,
            ...(fin.shadow === 'transparent' ? {} : { shadowColor: fin.brand, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }),
          }}
        >
          <MaterialIcons name="person-add" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Novo jogador</Text>
        </Pressable>
      )}

      {/* Filter dialog */}
      <Portal>
        <Dialog visible={filterVisible} onDismiss={() => setFilterVisible(false)}>
          <Dialog.Title>Filtrar por posição</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {POSITIONS.map(pos => {
                const sel = selectedPositions.includes(pos);
                return (
                  <Pressable
                    key={pos}
                    onPress={() => togglePositionFilter(pos)}
                    style={{ borderWidth: 1.5, borderColor: sel ? fin.brand : fin.line, backgroundColor: sel ? fin.brand : 'transparent', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 13.5, color: sel ? '#fff' : fin.sub }}>{pos}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable onPress={() => setFilterVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: fin.brand, fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
