import { View, ScrollView } from 'react-native';
import { Text, Button, IconButton, useTheme, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';

export default function ScoutScreen() {
  const { matchId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      };
    }, [])
  );

  useEffect(() => {
    if (typeof matchId === 'string') {
        loadData(matchId);
    }
  }, [matchId]);

  const loadData = async (id: string) => {
      const m = await matchService.getById(id);
      setMatch(m);
      if (m) {
          const p = await playerService.getByTeamId(m.teamId);
          setPlayers(p);
      }
  };

  const handleGenericPoint = async (type: 'our' | 'opponent') => {
      if (!match) return;
      const actionType = type === 'our' ? 'Erro Adversário' : 'Ponto Adversário';
      const scoreChange = type === 'our' ? 1 : -1;

      await matchService.addAction({
          matchId: match.id,
          playerId: null,
          setNumber: currentSet,
          actionType,
          quality: 0, // Irrelevant
          scoreChange
      });
      refreshMatch();
  };

  const refreshMatch = async () => {
      if (match) {
          const updatedMatch = await matchService.getById(match.id);
          setMatch(updatedMatch);
      }
      setSelectedPlayerId(null);
      setSelectedAction(null);
  };

  const handleQuality = async (quality: number) => {
      if (!selectedAction || !match) return;

      let scoreChange = 0;
      
      // Simple auto-scoring logic
      // Point Us (+1): Quality 3 on Attack/Block/Serve
      // Point Them (-1): Quality 0 on any action (Error)
      
      if (quality === 3 && ['Ataque', 'Bloqueio', 'Saque'].includes(selectedAction)) {
          scoreChange = 1;
      } else if (quality === 0) {
          scoreChange = -1; 
      }

      await matchService.addAction({
          matchId: match.id,
          playerId: selectedPlayerId,
          setNumber: currentSet,
          actionType: selectedAction,
          quality,
          scoreChange
      });

      refreshMatch();
  };

  if (!match) return <View><Text>Carregando...</Text></View>;

  return (
    <View className="flex-1 flex-row" style={{ backgroundColor: theme.colors.background }}>
       {/* Left: Players */}
       <View className="w-1/3 border-r" style={{ borderColor: theme.colors.outlineVariant }}>
          <View className="p-2 border-b flex-row justify-between items-center" style={{ borderColor: theme.colors.outlineVariant }}>
              <View>
                 <Text variant="titleMedium" style={{color: theme.colors.primary, fontWeight: 'bold'}}>
                     Nós {match.ourScore} x {match.opponentScore} Eles
                 </Text>
                 <Text variant="labelSmall">{match.opponentName}</Text>
              </View>
              <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Set {currentSet}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 8 }}>
              {players.map(p => (
                  <Button 
                    key={p.id} 
                    mode={selectedPlayerId === p.id ? 'contained' : 'outlined'}
                    onPress={() => setSelectedPlayerId(p.id)}
                    style={{ marginBottom: 8, borderColor: theme.colors.outline }}
                    contentStyle={{ justifyContent: 'flex-start' }}
                  >
                      #{p.number} {p.surname || p.name}
                  </Button>
              ))}
              <Divider style={{ marginVertical: 8 }} />
              <Button 
                 mode="contained-tonal"
                 onPress={() => handleGenericPoint('our')}
                 textColor={theme.colors.primary}
                 style={{ marginBottom: 8 }}
              >
                  +1 Erro Deles
              </Button>
               <Button 
                 mode="contained-tonal"
                 onPress={() => handleGenericPoint('opponent')}
                 textColor={theme.colors.error}
              >
                  +1 Ponto Deles
              </Button>
          </ScrollView>
       </View>

       {/* Right: Actions & Quality */}
       <View className="flex-1 p-4 justify-center">
          {!selectedAction ? (
              <View className="flex-row flex-wrap gap-4 justify-center">
                 {['Saque', 'Passe', 'Levantamento', 'Ataque', 'Bloqueio', 'Defesa'].map(act => (
                     <Button 
                       key={act} 
                       mode="elevated" 
                       style={{ width: '30%', aspectRatio: 1.5, justifyContent: 'center' }}
                       labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                       onPress={() => setSelectedAction(act)}
                       disabled={!selectedPlayerId} 
                     >
                        {act}
                     </Button>
                 ))}
                 {!selectedPlayerId && (
                     <Text style={{ width: '100%', textAlign: 'center', marginTop: 20, opacity: 0.5 }}>
                         Selecione um jogador primeiro
                     </Text>
                 )}
              </View>
          ) : (
              <View className="items-center justify-center gap-8">
                  <Text variant="headlineLarge">{selectedAction}</Text>
                  <View className="flex-row gap-6">
                       <Button 
                        mode="contained" 
                        buttonColor={theme.colors.error} 
                        style={{ height: 80, width: 80, justifyContent: 'center' }}
                        labelStyle={{ fontSize: 24 }}
                        onPress={() => handleQuality(0)}
                      >0</Button>
                       <Button 
                        mode="contained" 
                        buttonColor="orange" 
                        style={{ height: 80, width: 80, justifyContent: 'center' }}
                        labelStyle={{ fontSize: 24 }}
                        onPress={() => handleQuality(1)}
                      >1</Button>
                       <Button 
                        mode="contained" 
                        buttonColor="#FFD700" 
                        style={{ height: 80, width: 80, justifyContent: 'center' }}
                        labelStyle={{ fontSize: 24 }}
                        onPress={() => handleQuality(2)}
                      >2</Button>
                       <Button 
                        mode="contained" 
                        buttonColor="green" 
                        style={{ height: 80, width: 80, justifyContent: 'center' }}
                        labelStyle={{ fontSize: 24 }}
                        onPress={() => handleQuality(3)}
                      >3</Button>
                  </View>
                  <Button mode="outlined" onPress={() => setSelectedAction(null)}>Cancelar Ação</Button>
              </View>
          )}
       </View>
       
       <IconButton 
          icon="close" 
          size={20}
          style={{ position: 'absolute', top: 0, right: 0, margin: 0 }} 
          onPress={() => router.replace('/(app)/history')} 
       />
    </View>
  );
}
