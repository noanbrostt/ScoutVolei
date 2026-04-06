import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, useTheme, FAB, Card, Chip, IconButton, ActivityIndicator, Icon, Avatar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { matchService } from '../../src/services/matchService';
import { teamService } from '../../src/services/teamService';
import { useAuthStore } from '../../src/store/authStore';
import { syncService } from '../../src/services/syncService';

export default function MatchesHistory() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allMatches, allTeams] = await Promise.all([
      matchService.getAll(),
      teamService.getAll(),
    ]);

    const visible = user?.role === 'admin'
      ? allMatches
      : allMatches.filter(m => m.isFinished);

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
    if (match.isFinished) {
      router.push(`/scout/report/${match.id}`);
    } else {
      router.push({ pathname: '/scout/[matchId]', params: { matchId: match.id } });
    }
  };

  const handleDelete = (matchId: string) => {
    Alert.alert(
      'Excluir Partida',
      'Tem certeza que deseja excluir esta partida e todo o seu histórico? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          await matchService.delete(matchId);
          syncService.triggerSync();
          loadData();
        }},
      ]
    );
  };

  const renderMatchCard = (match: any) => {
    const date = new Date(match.date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const resultColor = match.setsUs > match.setsThem ? '#4CAF50' : match.setsUs === match.setsThem ? '#FBC02D' : theme.colors.error;

    return (
      <Card
        key={match.id}
        mode="elevated"
        style={{ backgroundColor: theme.colors.surface, borderLeftWidth: 4, borderLeftColor: resultColor }}
        onPress={() => handleMatchPress(match)}
      >
        <Card.Content>
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text variant="labelMedium" style={{ color: theme.colors.outline }}>{date}</Text>
                {match.hasPendingData && (
                  <Icon source="cloud-upload" size={16} color="#F9A825" />
                )}
              </View>
              <View className="flex-row items-center gap-1 flex-wrap">
                <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19, color: match.teamColor || theme.colors.primary }}>{match.teamName}</Text>
                <Text variant="bodyLarge" style={{ marginHorizontal: 4 }}>vs</Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19 }}>{match.opponentName}</Text>
              </View>
              <Text variant="bodySmall">{match.location || 'Sem local'}</Text>
            </View>
            <View className="items-center gap-2">
              <View style={{
                borderWidth: 1,
                borderColor: match.isFinished ? theme.colors.primary : '#FBC02D',
                borderRadius: 12, padding: 4,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Icon
                  source={match.isFinished ? 'check' : 'clock-outline'}
                  size={16}
                  color={match.isFinished ? theme.colors.primary : '#FBC02D'}
                />
              </View>
              {user?.role === 'admin' && (
                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => handleDelete(match.id)}
                  style={{ margin: 0 }}
                />
              )}
            </View>
          </View>

          <View style={{
            flexDirection: 'row', marginTop: 8, alignItems: 'center',
            justifyContent: 'center', gap: 16,
            backgroundColor: theme.colors.surfaceVariant,
            padding: 8, borderRadius: 8,
          }}>
            <View className="items-center" style={{ flex: 1 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>SETS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{match.setsUs}</Text>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>X</Text>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{match.setsThem}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pt-4 pb-2">
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Partidas
          </Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Histórico de jogos e estatísticas
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* Última Partida — fora do scroll */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 10 }}>
                Última Partida
              </Text>
              {lastMatch ? (
                renderMatchCard(lastMatch)
              ) : (
                <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
                  <Card.Content>
                    <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center', paddingVertical: 8 }}>
                      Nenhuma partida registrada
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>

            {/* Times — scrollável */}
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 16 }}>
              Times
            </Text>
            {teams.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
                  <Card.Content>
                    <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center', paddingVertical: 8 }}>
                      Nenhum time cadastrado
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            ) : (
              <FlatList
                data={teams}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                renderItem={({ item: team }) => (
                  <Card
                    mode="elevated"
                    onPress={() => router.push({ pathname: '/team-matches/[teamId]', params: { teamId: team.id } })}
                    style={{ marginBottom: 12, backgroundColor: theme.colors.elevation.level1 }}
                  >
                    <View className="flex-row items-center p-4">
                      <Avatar.Text
                        size={40}
                        label={team.name.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: team.color || theme.colors.primary, marginRight: 16 }}
                        color="#FFF"
                      />
                      <View className="flex-1 justify-center">
                        <View className="flex-row items-center gap-2">
                          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{team.name}</Text>
                          {team.hasPendingData && (
                            <Icon source="cloud-upload" size={16} color="#F9A825" />
                          )}
                        </View>
                      </View>
                      <Avatar.Icon
                        icon="chevron-right"
                        size={24}
                        style={{ backgroundColor: 'transparent' }}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </Card>
                )}
              />
            )}
          </>
        )}
      </SafeAreaView>

      {user?.role === 'admin' && (
        <FAB
          icon="plus"
          label="Novo Scout"
          style={{
            position: 'absolute', margin: 16, right: 0, bottom: 0,
            backgroundColor: theme.colors.primary,
          }}
          color="#FFF"
          onPress={() => router.push('/scout/setup')}
        />
      )}
    </View>
  );
}
