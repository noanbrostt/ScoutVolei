import { View } from 'react-native';
import { TextInput, Button, Appbar, useTheme, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { teamService } from '../../src/services/teamService';
import { matchService } from '../../src/services/matchService';

export default function ScoutSetup() {
  const router = useRouter();
  const theme = useTheme();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    teamService.getAll().then(setTeams);
  }, []);

  const handleStart = async () => {
    if (!selectedTeam || !opponent.trim()) return;
    setLoading(true);
    try {
      const match = await matchService.create(selectedTeam.id, opponent, location);
      router.replace(`/scout/${match.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Nova Partida" />
      </Appbar.Header>

      <View className="p-4 gap-4">
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined" 
              onPress={() => setMenuVisible(true)}
              contentStyle={{ justifyContent: 'flex-start' }}
              style={{ borderRadius: 4 }}
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

        <Button 
          mode="contained" 
          onPress={handleStart} 
          loading={loading}
          disabled={!selectedTeam || !opponent.trim() || loading}
          style={{ marginTop: 16, paddingVertical: 4 }}
        >
          Iniciar Scout
        </Button>
      </View>
    </View>
  );
}
