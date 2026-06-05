import { View, FlatList, RefreshControl, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { matchService } from '../../src/services/matchService';
import { teamService } from '../../src/services/teamService';
import { useAuthStore } from '../../src/store/authStore';
import { syncService } from '../../src/services/syncService';
import { useFin } from '../../src/theme';
import { Avatar } from '../../src/components/ui';
import { MatchCard } from '../../src/components/MatchCard';

export default function TeamMatches() {
  const fin = useFin();
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [matches, setMatches] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allMatches, teamData] = await Promise.all([
      matchService.getByTeam(teamId),
      teamService.getById(teamId),
    ]);
    const visible = isAdmin ? allMatches : allMatches.filter(m => m.isFinished);
    setMatches(visible);
    setTeam(teamData);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [teamId]));

  useEffect(() => {
    const unsub = syncService.subscribe(() => { loadData(); });
    return () => unsub();
  }, []);

  const handleMatchPress = (match: any) => {
    if (match.isFinished) router.push(`/scout/report/${match.id}`);
    else router.push({ pathname: '/scout/[matchId]', params: { matchId: match.id } });
  };

  const handleDelete = (matchId: string) => {
    Alert.alert('Excluir partida', 'Tem certeza que deseja excluir esta partida e todo o seu histórico? Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await matchService.delete(matchId);
        syncService.triggerSync();
        loadData();
      }},
    ]);
  };

  const headerColor = team?.color ?? fin.brand;

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      {/* Colored header with team color */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: headerColor }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, minHeight: 52 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          {team && <Avatar name={team.name} color="rgba(255,255,255,0.25)" size={32} fontSize={12} fin={fin} />}
          <Text numberOfLines={1} style={{ flex: 1, fontWeight: '800', fontSize: 19, color: '#fff', letterSpacing: -0.3 }}>
            {team?.name ?? 'Partidas'}
          </Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator animating size="large" color={fin.brand} />
        </View>
      ) : matches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: fin.ink, textAlign: 'center' }}>Nenhuma partida</Text>
          <Text style={{ fontSize: 14, color: fin.sub, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
            Nenhuma partida registrada para este time ainda.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MatchCard match={item} isAdmin={isAdmin} onPress={() => handleMatchPress(item)} onDelete={handleDelete} />
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        />
      )}

      {isAdmin && (
        <Pressable
          onPress={() => router.push('/scout/setup')}
          style={{
            position: 'absolute', right: 18, bottom: 56,
            flexDirection: 'row', alignItems: 'center', gap: 7,
            backgroundColor: fin.brand, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16,
            ...(fin.shadow === 'transparent' ? {} : { shadowColor: fin.brand, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }),
          }}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Novo scout</Text>
        </Pressable>
      )}
    </View>
  );
}
