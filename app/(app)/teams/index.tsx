import { View, FlatList, RefreshControl } from 'react-native';
import { Text, List, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { teamService } from '../../../src/services/teamService';

export default function TeamsList() {
  const theme = useTheme();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineMedium" style={{ margin: 16, color: theme.colors.primary, fontWeight: 'bold' }}>
        Meus Times
      </Text>
      
      {teams.length === 0 && !loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text variant="bodyLarge" style={{ opacity: 0.6, textAlign: 'center', marginBottom: 16 }}>
            Nenhum time cadastrado ainda.
          </Text>
          <FAB
             icon="plus"
             label="Criar Time"
             onPress={() => router.push('/(app)/teams/new')}
          />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTeams} />}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              left={props => <List.Icon {...props} icon="tshirt-crew" color={item.color} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push(`/(app)/teams/${item.id}`)}
              style={{ backgroundColor: theme.colors.surface, marginBottom: 1 }}
            />
          )}
        />
      )}

      {teams.length > 0 && (
        <FAB
          icon="plus"
          style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.primaryContainer
          }}
          onPress={() => router.push('/(app)/teams/new')}
        />
      )}
    </View>
  );
}
