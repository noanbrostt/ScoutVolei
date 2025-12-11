import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, useTheme, FAB, Card, Chip, IconButton, TouchableRipple, ActivityIndicator, Icon } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { matchService } from '../../src/services/matchService';
import { useAuthStore } from '../../src/store/authStore';
import { syncService } from '../../src/services/syncService';

export default function MatchesHistory() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMatches = async () => {
    setLoading(true);
    const data = await matchService.getAll();
    
    // Only admins can see ongoing matches
    const filteredData = user?.role === 'admin' 
      ? data 
      : data.filter(m => m.isFinished);
      
    setMatches(filteredData);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = syncService.subscribe(() => {
      loadMatches();
    });
    return () => unsubscribe();
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
          "Excluir Partida",
          "Tem certeza que deseja excluir esta partida e todo o seu histórico? Essa ação não pode ser desfeita.",
          [
              { text: "Cancelar", style: "cancel" },
              { text: "Excluir", style: "destructive", onPress: async () => {
                  await matchService.delete(matchId);
                  loadMatches();
              }}
          ]
      );
  };

  const renderItem = ({ item }: { item: any }) => {
      const date = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

      return (
          <Card 
            mode="elevated" 
            style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
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
                             <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19, color: theme.colors.primary }}>{item.teamName}</Text>
                             <Text variant="bodyLarge" style={{ marginHorizontal: 4 }}>vs</Text>
                             <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 19 }}>{item.opponentName}</Text>
                          </View>
                          <Text variant="bodySmall">{item.location || 'Sem local'}</Text>
                      </View>
                      <View className="items-center gap-2">
                        <View 
                            style={{ 
                                borderWidth: 1, 
                                borderColor: item.isFinished ? theme.colors.primary : '#FBC02D',
                                borderRadius: 12,
                                padding: 4,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Icon 
                                source={item.isFinished ? "check" : "clock-outline"} 
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
                  
                  <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: theme.colors.surfaceVariant, padding: 8, borderRadius: 8 }}>
                      <View className="items-center">
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>SETS</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                             <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.setsUs}</Text>
                             <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>X</Text>
                             <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.error }}>{item.setsThem}</Text>
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

        <View className="flex-1 px-4 pt-2">
            {loading ? (
                 <View className="flex-1 items-center justify-center">
                     <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
                     <Text style={{ marginTop: 10, color: '#888' }}>Carregando partidas...</Text>
                 </View>
            ) : matches.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                    Nenhuma partida
                    </Text>
                    <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                    Inicie um novo scout para registrar estatísticas em tempo real.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMatches} />}
                />
            )}
        </View>
      </SafeAreaView>

      {user?.role === 'admin' && (
        <FAB
            icon="plus"
            label="Novo Scout"
            style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.primary
            }}
            color="#FFF"
            onPress={() => router.push('/scout/setup')}
        />
      )}
    </View>
  );
}
