import { View, StatusBar, Platform, ScrollView } from 'react-native';
import { Text, Button, IconButton, useTheme, Portal, Dialog, RadioButton, Surface, TouchableRipple } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';

// Actions Config
const ACTIONS = [
    { label: 'SAQUE', key: 'Saque' },
    { label: 'PASSE', key: 'Passe' },
    { label: 'LEV', key: 'Levantamento' },
    { label: 'ATQ', key: 'Ataque' },
    { label: 'BLOQ', key: 'Bloqueio' },
    { label: 'DEF', key: 'Defesa' },
];

const QUALITIES = [
    { val: 0, color: '#D32F2F', label: '0' }, // Red
    { val: 1, color: '#F57C00', label: '1' }, // Orange
    { val: 2, color: '#FBC02D', label: '2' }, // Yellow
    { val: 3, color: '#388E3C', label: '3' }, // Green
];

export default function ScoutScreen() {
  const { matchId, initialLineup } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const [match, setMatch] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  
  // Selection State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: string, quality: number } | null>(null);
  
  const [currentSet, setCurrentSet] = useState(1);
  
  // Substitution State
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [subInId, setSubInId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Force Landscape & Immersive Mode
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync("hidden");
        NavigationBar.setBehaviorAsync("overlay-swipe");
      }
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync("visible");
        }
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
          setAllPlayers(p);
          
          let activeIds: string[] = [];
          if (initialLineup && typeof initialLineup === 'string') {
            try { activeIds = JSON.parse(initialLineup); } catch (e) {}
          }
          
          if (activeIds.length > 0) {
            setActivePlayers(p.filter(pl => activeIds.includes(pl.id)));
          } else {
             setActivePlayers(p.slice(0, 6));
          }
      }
  };

  const refreshMatch = async () => {
      if (match) {
          const updatedMatch = await matchService.getById(match.id);
          setMatch(updatedMatch);
      }
  };

  // --- Core Logic: Register Action ---
  const registerAction = async (playerId: string, actionType: string, quality: number) => {
      if (!match) return;

      let scoreChange = 0;
      if (quality === 3 && ['Ataque', 'Bloqueio', 'Saque'].includes(actionType)) {
          scoreChange = 1;
      } else if (quality === 0) {
          scoreChange = -1; 
      }

      await matchService.addAction({
          matchId: match.id,
          playerId,
          setNumber: currentSet,
          actionType,
          quality,
          scoreChange
      });

      // Reset Selection
      setSelectedPlayerId(null);
      setPendingAction(null);
      refreshMatch();
  };

  // --- Interactions ---

  const handlePlayerClick = (playerId: string) => {
      if (pendingAction) {
          // We have an action waiting, register immediately
          registerAction(playerId, pendingAction.type, pendingAction.quality);
      } else {
          // Select player and wait for action
          setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId);
      }
  };

  const handleActionClick = (type: string, quality: number) => {
      if (selectedPlayerId) {
          // We have a player waiting, register immediately
          registerAction(selectedPlayerId, type, quality);
      } else {
          // Select action and wait for player
          if (pendingAction && pendingAction.type === type && pendingAction.quality === quality) {
              setPendingAction(null);
          } else {
              setPendingAction({ type, quality });
          }
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
          quality: 0,
          scoreChange
      });
      refreshMatch();
  };

  // --- Substitution ---
  const confirmSubstitution = () => {
    if (!subOutId || !subInId) return;
    
    const newActive = activePlayers.map(p => {
      if (p.id === subOutId) {
        return allPlayers.find(ap => ap.id === subInId);
      }
      return p;
    });
    
    setActivePlayers(newActive);
    setSubModalVisible(false);
    setSubOutId(null);
    setSubInId(null);
  };

  const getReservePlayers = () => {
    const activeIds = activePlayers.map(p => p.id);
    return allPlayers.filter(p => !activeIds.includes(p.id));
  };


  if (!match) return <View className="flex-1 bg-black justify-center items-center"><Text className="text-white">Carregando...</Text></View>;

  return (
    <View className="flex-1 bg-gray-900">
        <StatusBar hidden />
        
        {/* TOP BAR */}
        <View className="h-14 flex-row items-center px-4 justify-between bg-gray-800 border-b border-gray-700">
            <View className="flex-row items-center gap-4">
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {match.ourScore} x {match.opponentScore}
                </Text>
                
                {/* Generic Points in Top Bar */}
                <View className="flex-row gap-2 ml-4">
                    <Button 
                        mode="contained" 
                        compact
                        buttonColor="#1B5E20" 
                        onPress={() => handleGenericPoint('our')}
                        labelStyle={{ fontSize: 12, marginHorizontal: 8 }}
                    >
                        +1 NÓS
                    </Button>
                    <Button 
                        mode="contained" 
                        compact
                        buttonColor="#B71C1C" 
                        onPress={() => handleGenericPoint('opponent')}
                        labelStyle={{ fontSize: 12, marginHorizontal: 8 }}
                    >
                        +1 DELES
                    </Button>
                </View>
            </View>
            
            <View className="flex-row gap-2">
                <Button 
                    mode="contained-tonal" 
                    compact 
                    icon="swap-horizontal" 
                    onPress={() => setSubModalVisible(true)}
                    labelStyle={{ fontSize: 12 }}
                >
                    Substituir
                </Button>
                <IconButton icon="close" size={20} onPress={() => router.replace('/(app)/history')} />
            </View>
        </View>

        {/* MAIN CONTENT */}
        <View className="flex-1 flex-row">
            
            {/* LEFT: PLAYERS */}
            <View className="w-[28%] flex-col p-2 border-r border-gray-700">
                <View className="flex-1 gap-2">
                    {activePlayers.map(p => (
                        <TouchableRipple
                            key={p.id}
                            onPress={() => handlePlayerClick(p.id)}
                            style={{ 
                                flex: 1, 
                                backgroundColor: selectedPlayerId === p.id ? theme.colors.primary : '#2A2A2A',
                                borderRadius: 8,
                                justifyContent: 'center',
                                paddingHorizontal: 12,
                                borderWidth: selectedPlayerId === p.id ? 2 : 0,
                                borderColor: '#FFF'
                            }}
                        >
                            <Text 
                                variant="titleMedium" 
                                numberOfLines={1}
                                style={{ 
                                    color: selectedPlayerId === p.id ? '#FFF' : '#E0E0E0', 
                                    fontWeight: 'bold',
                                    textAlign: 'left',
                                    fontSize: 18 
                                }}
                            >
                                {(p.surname || p.name || "").toUpperCase()}
                            </Text>
                        </TouchableRipple>
                    ))}
                </View>
            </View>

            {/* RIGHT: ACTION MATRIX */}
            <View className="flex-1 p-1 bg-black">
                {ACTIONS.map((action) => (
                    <View key={action.key} className="flex-1 flex-row mb-1 gap-1">
                        {/* Label Column */}
                        <View className="w-16 justify-center items-center bg-gray-800 rounded">
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{action.label}</Text>
                        </View>
                        
                        {/* Quality Buttons */}
                        {QUALITIES.map((q) => {
                            const isActive = pendingAction?.type === action.key && pendingAction?.quality === q.val;
                            return (
                                <TouchableRipple
                                    key={q.val}
                                    onPress={() => handleActionClick(action.key, q.val)}
                                    style={{ 
                                        flex: 1, 
                                        backgroundColor: isActive ? q.color : '#1A1A1A', // Darker default
                                        borderRadius: 4,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: isActive ? 2 : 1,
                                        borderColor: isActive ? '#FFF' : q.color // Border is color
                                    }}
                                >
                                    <Text style={{ 
                                        color: isActive ? '#FFF' : q.color, 
                                        fontSize: 20, 
                                        fontWeight: 'bold' 
                                    }}>
                                        {q.label}
                                    </Text>
                                </TouchableRipple>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>

        {/* SUBSTITUTION MODAL */}
        <Portal>
            <Dialog visible={subModalVisible} onDismiss={() => setSubModalVisible(false)} style={{ maxHeight: '90%' }}>
                <Dialog.Title style={{ fontSize: 18, paddingBottom: 0 }}>Substituição</Dialog.Title>
                <Dialog.Content>
                    <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 24 }}>
                        <View className="flex-row justify-between min-h-[200px]">
                            <View className="flex-1 mr-2">
                                <Text variant="labelMedium" style={{marginBottom: 8, fontWeight: 'bold'}}>QUEM SAI</Text>
                                <RadioButton.Group onValueChange={v => setSubOutId(v)} value={subOutId || ''}>
                                    {activePlayers.map(p => (
                                        <RadioButton.Item 
                                            key={p.id} 
                                            label={(p.surname || p.name).toUpperCase()} 
                                            value={p.id} 
                                            mode="android" 
                                            density="compact" // Compact density
                                            style={{ paddingVertical: 2 }}
                                            labelStyle={{ fontSize: 12 }}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </View>
                            <View className="flex-1 ml-2 border-l border-gray-200 pl-2">
                                <Text variant="labelMedium" style={{marginBottom: 8, fontWeight: 'bold'}}>QUEM ENTRA</Text>
                                <RadioButton.Group onValueChange={v => setSubInId(v)} value={subInId || ''}>
                                    {getReservePlayers().map(p => (
                                        <RadioButton.Item 
                                            key={p.id} 
                                            label={(p.surname || p.name).toUpperCase()} 
                                            value={p.id} 
                                            mode="android" 
                                            density="compact"
                                            style={{ paddingVertical: 2 }}
                                            labelStyle={{ fontSize: 12 }}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </View>
                        </View>
                    </ScrollView>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setSubModalVisible(false)}>Cancelar</Button>
                    <Button mode="contained" onPress={confirmSubstitution} disabled={!subOutId || !subInId}>Confirmar</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    </View>
  );
}
