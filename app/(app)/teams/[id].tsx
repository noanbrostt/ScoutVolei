import { View, FlatList, Alert } from 'react-native';
import { Text, List, FAB, Appbar, useTheme, IconButton, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { teamService } from '../../../src/services/teamService';
import { playerService } from '../../../src/services/playerService';

export default function TeamDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const handleDeletePlayer = (playerId: string) => {
    Alert.alert('Excluir Jogador', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          await playerService.delete(playerId);
          loadData();
        }
      }
    ]);
  };

  if (!team && !loading) return <View><Text>Time não encontrado</Text></View>;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={team?.name || 'Detalhes'} subtitle={team?.city} />
      </Appbar.Header>

      <View className="flex-1">
        <List.Subheader>Elenco ({players.length})</List.Subheader>
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={`${item.number} - ${item.surname || item.name}`}
              description={`${item.position} | ${item.name}`}
              left={props => <List.Icon {...props} icon="account" />}
              right={props => <IconButton {...props} icon="delete" onPress={() => handleDeletePlayer(item.id)} />}
            />
          )}
          ItemSeparatorComponent={Divider}
        />
      </View>

      <FAB
        icon="account-plus"
        label="Add Jogador"
        style={{
          position: 'absolute',
          margin: 16,
          right: 0,
          bottom: 0,
        }}
        onPress={() => router.push({ pathname: '/(app)/teams/add-player', params: { teamId: id } })}
      />
    </View>
  );
}
