import { View, FlatList, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, FAB, Appbar, useTheme, IconButton, Surface, Avatar, Chip, Portal, Dialog, Button, Checkbox } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { teamService } from '../../../src/services/teamService';
import { playerService } from '../../../src/services/playerService';

const POSITIONS = ['Ponteiro', 'Central', 'Oposto', 'Levantador', 'Líbero'];

export default function TeamDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]); // Empty = All

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

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (selectedPositions.length > 0) {
      result = players.filter(p => selectedPositions.includes(p.position));
    }
    // Sort by surname (nickname) or name
    return result.sort((a, b) => {
      const nameA = a.surname || a.name;
      const nameB = b.surname || b.name;
      return nameA.localeCompare(nameB);
    });
  }, [players, selectedPositions]);

  const togglePositionFilter = (pos: string) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(selectedPositions.filter(p => p !== pos));
    } else {
      setSelectedPositions([...selectedPositions, pos]);
    }
  };

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

  const handleDeleteTeam = () => {
    Alert.alert('Excluir Time', 'Tem certeza? Isso apagará todos os jogadores e dados associados.', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          await teamService.delete(id as string);
          router.back();
        }
      }
    ]);
  };

  if (!team && !loading) return <View className="flex-1 justify-center items-center"><Text>Time não encontrado</Text></View>;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: team?.color || theme.colors.primary }}>
        <Appbar.BackAction onPress={() => router.back()} color="#FFF" />
        <Appbar.Content title={team?.name || 'Detalhes'} titleStyle={{ color: '#FFF', fontWeight: 'bold' }} />
        <Appbar.Action icon="export-variant" color="#FFF" onPress={() => router.push({ pathname: '/(app)/teams/export', params: { teamId: id } })} />
        <Appbar.Action icon="pencil" color="#FFF" onPress={() => router.push({ pathname: '/(app)/teams/edit', params: { id } })} />
        <Appbar.Action icon="delete" color="#FFF" onPress={handleDeleteTeam} />
      </Appbar.Header>

      <View className="flex-1 px-4 pt-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text variant="titleMedium" style={{ fontWeight: 'bold', opacity: 0.7 }}>
            Atletas ({filteredPlayers.length})
          </Text>
          <View className="flex-row items-center">
            {selectedPositions.length > 0 && (
              <Button mode="text" compact onPress={() => setSelectedPositions([])}>
                Limpar
              </Button>
            )}
            <IconButton 
              icon="filter-variant" 
              mode="text"
              iconColor={selectedPositions.length > 0 ? theme.colors.primary : theme.colors.onSurface}
              onPress={() => setFilterVisible(true)} 
            />
          </View>
        </View>
        
        <FlatList
          data={filteredPlayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Surface 
              style={{ 
                marginBottom: 8, 
                borderRadius: 12, 
                backgroundColor: theme.colors.elevation.level1,
                overflow: 'hidden'
              }}
              elevation={1}
            >
              <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/teams/view-player', params: { playerId: item.id } })}>
                <View className="flex-row items-center p-3">
                  {/* Avatar/Initial (Optional replacement for number badge, or just text) */}
                  {/* Let's keep it clean without number badge as requested */}

                  {/* Info */}
                  <View className="flex-1 mr-2">
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>
                      {item.surname || item.name.split(' ')[0]}
                    </Text>
                    <Text variant="bodySmall" style={{ opacity: 0.7 }} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                  </View>

                  {/* Actions Row - Compact */}
                  <View className="flex-row items-center">
                    <Chip 
                      compact 
                      mode="outlined" 
                      style={{ marginRight: 8, height: 24, justifyContent: 'center' }} 
                      textStyle={{ fontSize: 10, lineHeight: 10, marginVertical: 0, marginHorizontal: 6, textAlign: 'center' }}
                    >
                      {item.position}
                    </Chip>
                    
                    <IconButton 
                      icon="pencil" 
                      size={20} 
                      style={{ margin: 0, padding: 0 }}
                      onPress={() => router.push({ pathname: '/(app)/teams/edit-player', params: { playerId: item.id } })} 
                    />
                    <IconButton 
                      icon="delete" 
                      size={20} 
                      iconColor={theme.colors.error}
                      style={{ margin: 0, padding: 0 }}
                      onPress={() => handleDeletePlayer(item.id)} 
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Surface>
          )}
        />
      </View>

      <FAB
        icon="account-plus"
        label="Novo Jogador"
        style={{
          position: 'absolute',
          margin: 16,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.primary
        }}
        color="#FFF"
        onPress={() => router.push({ pathname: '/(app)/teams/add-player', params: { teamId: id } })}
      />

      {/* Filter Dialog */}
      <Portal>
        <Dialog visible={filterVisible} onDismiss={() => setFilterVisible(false)}>
          <Dialog.Title style={{ textAlign: 'center' }}>Filtrar por Posição</Dialog.Title>
          <Dialog.Content>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {POSITIONS.map(pos => {
                 const isSelected = selectedPositions.includes(pos);
                 return (
                   <Chip
                     key={pos}
                     mode="flat"
                     selected={isSelected}
                     showSelectedOverlay={false}
                     icon={() => null} // Force no icon
                     onPress={() => togglePositionFilter(pos)}
                     style={{ 
                       margin: 4,
                       backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                       borderColor: isSelected ? theme.colors.primary : 'transparent',
                       borderWidth: 1
                     }}
                     textStyle={{
                       color: isSelected ? '#FFF' : theme.colors.onSurfaceVariant,
                       fontWeight: isSelected ? 'bold' : 'normal'
                     }}
                   >
                     {pos}
                   </Chip>
                 );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFilterVisible(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}