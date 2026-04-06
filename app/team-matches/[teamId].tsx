import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, useTheme, FAB, Card, IconButton, ActivityIndicator, Icon, Appbar, Avatar } from 'react-native-paper';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { matchService } from '../../src/services/matchService';
import { teamService } from '../../src/services/teamService';
import { useAuthStore } from '../../src/store/authStore';
import { syncService } from '../../src/services/syncService';

export default function TeamMatches() {
  const theme = useTheme();
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allMatches, teamData] = await Promise.all([
      matchService.getByTeam(teamId),
      teamService.getById(teamId),
    ]);

    const visible = user?.role === 'admin'
      ? allMatches
      : allMatches.filter(m => m.isFinished);

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
          loadData();
        }},
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const resultColor = item.setsUs > item.setsThem ? '#4CAF50' : item.setsUs === item.setsThem ? '#FBC02D' : theme.colors.error;

    return (
      <Card
        mode="elevated"
        style={{ marginBottom: 12, backgroundColor: theme.colors.surface, borderLeftWidth: 4, borderLeftColor: resultColor }}
        onPress={() => handleMatchPress(item)}
      >
        <Card.Content>
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text variant="labelMedium" style={{ color: theme.colors.outline }}>{date}</Text>
                {item.hasPendingData && (
                  <Icon source="cloud-upload" size={16} color="#F9A825" />
                )}
              </View>
              <View className="flex-row items-center gap-1 flex-wrap">
                <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19, color: item.teamColor || theme.colors.primary }}>{item.teamName}</Text>
                <Text variant="bodyLarge" style={{ marginHorizontal: 4 }}>vs</Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19 }}>{item.opponentName}</Text>
              </View>
              <Text variant="bodySmall">{item.location || 'Sem local'}</Text>
            </View>
            <View className="items-center gap-2">
              <View style={{
                borderWidth: 1,
                borderColor: item.isFinished ? theme.colors.primary : '#FBC02D',
                borderRadius: 12, padding: 4,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Icon
                  source={item.isFinished ? 'check' : 'clock-outline'}
                  size={16}
                  color={item.isFinished ? theme.colors.primary : '#FBC02D'}
                />
              </View>
              {user?.role === 'admin' && (
                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => handleDelete(item.id)}
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
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{item.setsUs}</Text>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>X</Text>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{item.setsThem}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.elevation.level2 }}>
        <Appbar.Header style={{ backgroundColor: 'transparent' }} statusBarHeight={0}>
          <Appbar.BackAction onPress={() => router.back()} />
          {team && (
            <Avatar.Text
              size={32}
              label={team.name.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: team.color || theme.colors.primary, marginRight: 8 }}
              color="#FFF"
            />
          )}
          <Appbar.Content title={team?.name ?? 'Partidas'} />
        </Appbar.Header>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
        </View>
      ) : matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
            Nenhuma partida
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
            Nenhuma partida registrada para este time ainda.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        />
      )}

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
