import { View, ScrollView, FlatList, Alert } from 'react-native';
import { TextInput, Button, Appbar, useTheme, Menu, Text, Checkbox, Divider, Chip, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { teamService } from '../../src/services/teamService';
import { playerService } from '../../src/services/playerService';
import { matchService } from '../../src/services/matchService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScoutSetup() {
  const router = useRouter();
  const theme = useTheme();
  
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  
  // Step 2 Data
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    teamService.getAll().then(setTeams);
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      playerService.getByTeamId(selectedTeam.id).then(players => {
        const sorted = players.sort((a: any, b: any) => {
            const na = a.surname || a.name;
            const nb = b.surname || b.name;
            return na.localeCompare(nb);
        });
        setTeamPlayers(sorted);
        setSelectedPlayerIds([]); // Reset selection on team change
      });
    }
  }, [selectedTeam]);

  const togglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    } else {
      if (selectedPlayerIds.length >= 7) {
        Alert.alert('Limite Atingido', 'Você pode selecionar no máximo 7 jogadores (6 em quadra + 1 Líbero).');
        return;
      }
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const handleNext = () => {
    if (!selectedTeam || !opponent.trim()) {
      Alert.alert('Atenção', 'Selecione um time e informe o adversário.');
      return;
    }
    setStep(2);
  };

  const handleStart = async () => {
    if (selectedPlayerIds.length < 7) {
      Alert.alert('Atenção', 'Selecione exatamente 7 atletas (6 Titulares + 1 Líbero) para iniciar.');
      return;
    }

    setLoading(true);
    try {
      // Create match
      const match = await matchService.create(selectedTeam.id, opponent, location);
      
      // Pass selected players to the scout screen via params
      router.replace({
        pathname: `/scout/${match.id}`,
        params: { 
          initialLineup: JSON.stringify(selectedPlayerIds) 
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao criar partida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => step === 1 ? router.back() : setStep(1)} />
        <Appbar.Content title={step === 1 ? "Nova Partida" : "Escalação Inicial"} />
      </Appbar.Header>

      {step === 1 ? (
        <View className="p-4 gap-4">
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Dados do Jogo</Text>
          
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setMenuVisible(true)}
                contentStyle={{ justifyContent: 'flex-start', height: 56 }}
                style={{ borderRadius: 4, borderColor: theme.colors.outline }}
                labelStyle={{ fontSize: 16, paddingTop: 8 }} 
                textColor={selectedTeam ? theme.colors.primary : theme.colors.onSurfaceVariant}
              >
                {selectedTeam ? selectedTeam.name : 'Selecionar Meu Time'}
              </Button>
            }
          >
            {teams.map(t => (
              <Menu.Item 
                key={t.id} 
                onPress={() => { setSelectedTeam(t); setMenuVisible(false); }} 
                title={t.name} 
              />
            ))}
          </Menu>

          <TextInput
            label="Nome do Adversário *"
            value={opponent}
            onChangeText={setOpponent}
            mode="outlined"
          />
          
          <TextInput
            label="Local (Ginásio/Cidade)"
            value={location}
            onChangeText={setLocation}
            mode="outlined"
          />

          <View className="flex-1" />
          
          <Button 
            mode="contained" 
            onPress={handleNext} 
            disabled={!selectedTeam || !opponent.trim()}
            style={{ paddingVertical: 6 }}
          >
            Próximo: Escalação
          </Button>
        </View>
      ) : (
        <View className="flex-1">
           <Surface className="p-4 border-b" style={{ backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }}>
             <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
               Selecione quem começa jogando (Máx 7).
             </Text>
             <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 4, fontWeight: 'bold' }}>
               Selecionados: {selectedPlayerIds.length}/7
             </Text>
           </Surface>

           <FlatList
             data={teamPlayers}
             keyExtractor={item => item.id}
             contentContainerStyle={{ paddingBottom: 20 }}
             renderItem={({ item }) => {
               const isSelected = selectedPlayerIds.includes(item.id);
               return (
                 <Surface 
                   style={{ 
                     marginHorizontal: 16, 
                     marginVertical: 4, 
                     borderRadius: 8, 
                     backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface 
                   }}
                   elevation={1}
                 >
                   <Checkbox.Item
                     label={`${item.number} - ${item.surname || item.name} (${item.position})`}
                     status={isSelected ? 'checked' : 'unchecked'}
                     onPress={() => togglePlayer(item.id)}
                     mode="android"
                     position="leading"
                     labelStyle={{ textAlign: 'left', fontWeight: isSelected ? 'bold' : 'normal' }}
                   />
                 </Surface>
               );
             }}
           />

           <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
             <View className="p-4 pt-2 border-t border-gray-200">
                            <Button 
                              mode="contained" 
                              onPress={handleStart} 
                              loading={loading}
                              disabled={selectedPlayerIds.length < 7 || loading}
                              style={{ paddingVertical: 6 }}
                            >                 Iniciar Partida
               </Button>
             </View>
           </SafeAreaView>
        </View>
      )}
    </View>
  );
}
