import { View, FlatList, RefreshControl, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { matchService } from '../../src/services/matchService';
import { teamService } from '../../src/services/teamService';
import { useAuthStore } from '../../src/store/authStore';
import { syncService } from '../../src/services/syncService';
import { useFin } from '../../src/theme';
import { cardShadow, Avatar } from '../../src/components/ui';
import { MatchCard } from '../../src/components/MatchCard';

export default function MatchesHistory() {
  const fin = useFin();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allMatches, allTeams] = await Promise.all([
      matchService.getAll(),
      teamService.getAll(),
    ]);
    const visible = isAdmin ? allMatches : allMatches.filter(m => m.isFinished);
    setLastMatch(visible[0] ?? null);
    setTeams(allTeams);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

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

  const sectionLabel = (txt: string) => (
    <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub, marginBottom: 10 }}>{txt}</Text>
  );

  const emptyCard = (txt: string) => (
    <View style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 18, ...cardShadow(fin) }}>
      <Text style={{ color: fin.sub, fontWeight: '600', textAlign: 'center' }}>{txt}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 26, color: fin.ink, letterSpacing: -0.4 }}>Partidas</Text>
          <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', marginTop: 2 }}>Histórico de jogos e estatísticas</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator animating size="large" color={fin.brand} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          ListHeaderComponent={
            <>
              {sectionLabel('Última partida')}
              {lastMatch
                ? <MatchCard match={lastMatch} isAdmin={isAdmin} onPress={() => handleMatchPress(lastMatch)} onDelete={handleDelete} />
                : emptyCard('Nenhuma partida registrada')}
              <View style={{ height: 14 }} />
              {sectionLabel('Times')}
              {teams.length === 0 && emptyCard('Nenhum time cadastrado')}
            </>
          }
          renderItem={({ item: team }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/team-matches/[teamId]', params: { teamId: team.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fin.surface, borderRadius: 14, padding: 14, marginBottom: 10, ...cardShadow(fin) }}
            >
              <Avatar name={team.name} color={team.color ?? fin.brand} size={44} fin={fin} />
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 18, color: fin.ink, letterSpacing: -0.2 }}>{team.name}</Text>
                {team.hasPendingData && <MaterialIcons name="cloud-upload" size={16} color={fin.warn} />}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={fin.sub} />
            </Pressable>
          )}
        />
      )}

      {isAdmin && (
        <Pressable
          onPress={() => router.push('/scout/setup')}
          style={{
            position: 'absolute', right: 18, bottom: 18,
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
