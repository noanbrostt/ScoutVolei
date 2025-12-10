import { View, FlatList, RefreshControl } from 'react-native';
import { Text, FAB, useTheme, Avatar, Card, Surface } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { teamService } from '../../../src/services/teamService';
import { useAuthStore } from '../../../src/store/authStore';

export default function TeamsList() {
  const theme = useTheme();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user); // Get user

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [])
  );

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <View className="px-4 pt-4 pb-2">
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Meus Times
          </Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Gerencie seus times e atletas
          </Text>
        </View>
      </SafeAreaView>
      
      {teams.length === 0 && !loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
            Nenhum time ainda
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8, marginBottom: 24, opacity: 0.7 }}>
            Cadastre seu primeiro time para começar a registrar scouts e estatísticas.
          </Text>
          {user?.role === 'admin' && (
            <FAB
               icon="plus"
               label="Criar Novo Time"
               onPress={() => router.push('/(app)/teams/new')}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTeams} />}
          renderItem={({ item }) => (
            <Card 
              mode="elevated" 
              onPress={() => router.push(`/(app)/teams/${item.id}`)}
              style={{ marginBottom: 12, backgroundColor: theme.colors.elevation.level1 }}
            >
              <View className="flex-row items-center p-4">
                <Avatar.Text 
                  size={40}
                  label={getInitials(item.name)} 
                  style={{ backgroundColor: item.color || theme.colors.primary, marginRight: 16 }} 
                  color="#FFF"
                />
                <View className="flex-1 justify-center">
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {item.name}
                  </Text>
                </View>
                <Avatar.Icon icon="chevron-right" size={24} style={{ backgroundColor: 'transparent' }} color={theme.colors.onSurfaceVariant} />
              </View>
            </Card>
          )}
        />
      )}

      {teams.length > 0 && user?.role === 'admin' && (
        <FAB
          icon="plus"
          style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.primary
          }}
          color="#FFF"
          onPress={() => router.push('/(app)/teams/new')}
        />
      )}
    </View>
  );
}
