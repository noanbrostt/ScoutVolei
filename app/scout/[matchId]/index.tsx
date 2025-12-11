import { View, StatusBar, Platform, ScrollView, FlatList, Alert } from 'react-native';
import { Text, Button, IconButton, useTheme, Portal, Dialog, RadioButton, Surface, TouchableRipple } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';
import * as NavigationBar from 'expo-navigation-bar';

// Actions Config
const ACTIONS = [
    { label: 'SAQUE', key: 'Saque' },
    { label: 'PASSE', key: 'Passe' },
    { label: 'ATQ', key: 'Ataque' },
    { label: 'LEV', key: 'Levantamento' },
    { label: 'DEF', key: 'Defesa' },
    { label: 'BLOQ', key: 'Bloqueio' },
];

const QUALITIES = [
    { val: 0, color: '#D32F2F', label: '0' }, // Red
    { val: 1, color: '#F57C00', label: '1' }, // Orange
    { val: 2, color: '#FBC02D', label: '2' }, // Yellow
    { val: 3, color: '#388E3C', label: '3' }, // Green
];

const POSITION_ORDER: Record<string, number> = {
    'Ponteiro': 1,
    'Líbero': 2,
    'Levantador': 3,
    'Oposto': 4,
    'Central': 5
};

export default function ScoutScreen() {
  const { matchId, initialLineup } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const [match, setMatch] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  
  // Selection State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: string, quality: number } | null>(null);
  
  const [currentSet, setCurrentSet] = useState(1);
  
  // Substitution State
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [subInId, setSubInId] = useState<string | null>(null);

  // Finish Set / Match State
  const [finishSetDialogVisible, setFinishSetDialogVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Force Landscape & Immersive Mode
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync("hidden");
      }
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        StatusBar.setHidden(false);
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
          await loadActions(id); // Await this to ensure recentActions are populated
          
          let activeIds: string[] = [];
          if (initialLineup && typeof initialLineup === 'string') {
            try { activeIds = JSON.parse(initialLineup); } catch (e) {}
          }
          
          let actives = [];
          if (activeIds.length > 0) {
            actives = p.filter(pl => activeIds.includes(pl.id));
          } else {
             actives = p.slice(0, 7);
          }

          sortActivePlayers(actives);
      }
  };

  const loadActions = async (id: string) => {
      const actions = await matchService.getActions(id);
      setRecentActions(actions);
      
      // Determine current set from actions
      if (actions.length > 0) {
          const maxSet = Math.max(...actions.map(a => a.setNumber));
          setCurrentSet(maxSet);
      } else {
          setCurrentSet(1);
      }
  };

  // Compute Score for Current Set
  const currentSetScoreUs = recentActions
    .filter(a => a.setNumber === currentSet && a.scoreChange > 0)
    .length;
    
  const currentSetScoreThem = recentActions
    .filter(a => a.setNumber === currentSet && a.scoreChange < 0)
    .length;

  const handleNextSet = async () => {
      setCurrentSet(prev => prev + 1);
      setFinishSetDialogVisible(false);
  };

  const handleEndMatch = async () => {
      if (!match) return;
      await matchService.finish(match.id);
      router.replace('/(app)/history');
  };

  const sortActivePlayers = (players: any[]) => {
      const sorted = [...players].sort((a, b) => {
          const posA = POSITION_ORDER[a.position] || 99;
          const posB = POSITION_ORDER[b.position] || 99;
          return posA - posB;
      });
      setActivePlayers(sorted);
  };

  const refreshMatch = async () => {
      if (match) {
          const updatedMatch = await matchService.getById(match.id);
          setMatch(updatedMatch);
          loadActions(match.id);
      }
  };

  const handleDeleteAction = (actionId: string) => {
      Alert.alert('Desfazer Ação', 'Deseja excluir esta ação e reverter a pontuação?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: async () => {
              await matchService.deleteAction(actionId);
              refreshMatch();
          }}
      ]);
  };

  const handleActionLogPress = (action: any) => {
      handleDeleteAction(action.id);
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
          quality: type === 'our' ? 3 : 0,
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
    
    sortActivePlayers(newActive);
    
    setSubModalVisible(false);
    setSubOutId(null);
    setSubInId(null);
  };

  const getReservePlayers = () => {
    const activeIds = activePlayers.map(p => p.id);
    return allPlayers
        .filter(p => !activeIds.includes(p.id))
        .sort((a, b) => {
            const na = a.surname || a.name;
            const nb = b.surname || b.name;
            return na.localeCompare(nb);
        });
  };


  if (!match) return <View className="flex-1 bg-black justify-center items-center"><Text className="text-white">Carregando...</Text></View>;

  return (
    <View className="flex-1 bg-gray-900">
        <StatusBar hidden />
        
        {/* TOP BAR */}
        <View className="h-14 flex-row items-center px-4 justify-between bg-gray-800 border-b border-gray-700">
            {/* Substituir Button (Left) */}
            <Button 
                mode="outlined" 
                compact 
                icon="swap-horizontal" 
                onPress={() => setSubModalVisible(true)}
                contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                labelStyle={{ fontSize: 12, lineHeight: 12 }}
                textColor="#E0E0E0"
                style={{ borderColor: "#666", paddingLeft: 2, paddingRight: 4 }}
            >
                Substituir
            </Button>
            
            {/* Score and Generic Points (Center) */}
            <View className="flex-row items-center gap-2">
                <Button 
                    mode="contained" 
                    compact
                    buttonColor="#1B5E20" 
                    onPress={() => handleGenericPoint('our')}
                    labelStyle={{ lineHeight: 12, fontSize: 12, marginHorizontal: 8 }} 
                    textColor="#FFF" 
                >
                    +1 NÓS
                </Button>
                <View className="items-center">
                    <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {currentSetScoreUs} x {currentSetScoreThem}
                    </Text>
                    <Text style={{ color: '#AAA', fontSize: 10, fontWeight: 'bold' }}>
                        SET {currentSet}
                    </Text>
                </View>
                <Button 
                    mode="contained" 
                    compact
                    buttonColor="#B71C1C" 
                    onPress={() => handleGenericPoint('opponent')}
                    labelStyle={{ lineHeight: 12, fontSize: 12, marginHorizontal: 8 }} 
                    textColor="#FFF" 
                >
                    +1 DELES
                </Button>
            </View>
            
            {/* Finish Set / Close Button (Right) */}
             <View className="flex-row items-center gap-0.5">
                <Button
                    mode="outlined"
                    compact
                    icon="flag-checkered"
                    onPress={() => setFinishSetDialogVisible(true)}
                    textColor="#E0E0E0"
                    labelStyle={{ fontSize: 12, lineHeight: 12 }}
                    style={{ borderColor: "#666", paddingLeft: 2, paddingRight: 4 }}
                >
                    Fim Set
                </Button>
                <IconButton icon="close" size={20} iconColor="#E0E0E0" onPress={() => router.replace('/(app)/history')} />
            </View>
        </View>

        {/* MAIN CONTENT */}
        <View className="flex-1 flex-row">
            
            {/* LEFT: PLAYERS (25%) */}
            <View className="w-[25%] flex-col p-2 border-r border-gray-700">
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
                                    fontSize: 16 
                                }}
                            >
                                {(p.surname || p.name || "").toUpperCase()}
                            </Text>
                        </TouchableRipple>
                    ))}
                </View>
            </View>

            {/* MIDDLE: LOG (20%) */}
            <View className="w-[20%] bg-gray-800 border-r border-gray-700">
                <Text style={{ color: '#AAA', textAlign: 'center', padding: 4, fontSize: 10, fontWeight: 'bold' }}>HISTÓRICO</Text>
                <FlatList
                    data={recentActions.filter(a => a.setNumber === currentSet)}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 4 }}
                    renderItem={({ item }) => {
                        const player = allPlayers.find(p => p.id === item.playerId);
                        let color = '#BBB'; // Default Grey
                        if (item.scoreChange > 0) color = '#4CAF50'; // Green
                        if (item.scoreChange < 0) color = '#F44336'; // Red

                        return (
                            <TouchableRipple 
                                onPress={() => handleActionLogPress(item)} 
                                style={{ 
                                    marginBottom: 4, 
                                    padding: 6, 
                                    borderRadius: 4, 
                                    backgroundColor: '#333',
                                    borderLeftWidth: 3,
                                    borderLeftColor: color
                                }}
                            >
                                <View>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                                        {player ? (player.surname || player.name || "").toUpperCase() : 'GERAL'}
                                    </Text>
                                    <View className="flex-row justify-between">
                                        <Text style={{ color: '#CCC', fontSize: 10 }}>{item.actionType}</Text>
                                        <Text style={{ color: color, fontWeight: 'bold', fontSize: 10 }}>{item.quality}</Text>
                                    </View>
                                </View>
                            </TouchableRipple>
                        );
                    }}
                />
            </View>

            {/* RIGHT: ACTION MATRIX (Flex) */}
            <View className="flex-1 p-1 bg-black">
                {ACTIONS.map((action) => (
                    <View key={action.key} className="flex-1 flex-row mb-1 gap-1">
                        {/* Label Column */}
                        <View className="w-14 justify-center items-center bg-gray-800 rounded">
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>{action.label}</Text>
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
                                        backgroundColor: isActive ? q.color : '#1A1A1A', 
                                        borderRadius: 4,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: isActive ? 2 : 1,
                                        borderColor: isActive ? '#FFF' : q.color 
                                    }}
                                >
                                    <Text style={{ 
                                        color: isActive ? '#FFF' : q.color, 
                                        fontSize: 18, 
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

        {/* FINISH SET DIALOG */}
        <Portal>
            <Dialog visible={finishSetDialogVisible} onDismiss={() => setFinishSetDialogVisible(false)} style={{ maxWidth: 400, alignSelf: 'center', width: '90%' }}>
                <Dialog.Title style={{ textAlign: 'center' }}>Fim do Set {currentSet}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="headlineMedium" style={{ textAlign: 'center', marginTop: 8, marginBottom: 0, fontWeight: 'bold' }}>
                        {currentSetScoreUs} x {currentSetScoreThem}
                    </Text>
                </Dialog.Content>
                <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 }}>
                    <Button onPress={() => setFinishSetDialogVisible(false)}>
                        Cancelar
                    </Button>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Button 
                            mode="outlined" 
                            onPress={handleEndMatch}
                            textColor={theme.colors.error}
                            style={{ borderColor: theme.colors.error }}
                        >
                            Fim Jogo
                        </Button>
                        <Button 
                            mode="contained" 
                            onPress={handleNextSet}
                        >
                            Próximo Set
                        </Button>
                    </View>
                </Dialog.Actions>
            </Dialog>
        </Portal>

        {/* SUBSTITUTION MODAL */}
        <Portal>
            <Dialog visible={subModalVisible} onDismiss={() => setSubModalVisible(false)} style={{ maxHeight: '90%' }}>
                <Dialog.Content>
                    <View style={{ height: 200, overflow: 'hidden' }}> 
                        {/* Headers Fixed */}
                        <View className="flex-row justify-between border-b border-gray-200 pb-2 mb-2">
                            <View className="flex-1 mr-2">
                                <Text variant="labelMedium" style={{fontWeight: 'bold'}}>QUEM SAI</Text>
                            </View>
                            <View className="flex-1 ml-2 pl-2 border-l border-transparent">
                                <Text variant="labelMedium" style={{fontWeight: 'bold'}}>QUEM ENTRA</Text>
                            </View>
                        </View>

                        {/* Scrollable Lists Container */}
                        <View className="flex-1 flex-row"> 
                            {/* OUT List */}
                            <ScrollView className="flex-1 mr-2" nestedScrollEnabled contentContainerStyle={{ paddingBottom: 16 }}>
                                <RadioButton.Group onValueChange={v => setSubOutId(v)} value={subOutId || ''}>
                                    {activePlayers.map(p => (
                                        <RadioButton.Item 
                                            key={p.id} 
                                            label={(p.surname || p.name).toUpperCase()} 
                                            value={p.id} 
                                            mode="android" 
                                            style={{ paddingVertical: 4 }}
                                            labelStyle={{ fontSize: 14 }}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </ScrollView>

                            {/* Vertical Divider */}
                            <View className="w-[1px] bg-gray-200 mx-1 h-full" />

                            {/* IN List */}
                            <ScrollView className="flex-1 ml-2" nestedScrollEnabled contentContainerStyle={{ paddingBottom: 16 }}>
                                <RadioButton.Group onValueChange={v => setSubInId(v)} value={subInId || ''}>
                                    {getReservePlayers().map(p => (
                                        <RadioButton.Item 
                                            key={p.id} 
                                            label={(p.surname || p.name).toUpperCase()} 
                                            value={p.id} 
                                            mode="android" 
                                            style={{ paddingVertical: 4 }}
                                            labelStyle={{ fontSize: 14 }}
                                        />
                                    ))}
                                </RadioButton.Group>
                            </ScrollView>
                        </View>
                    </View>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setSubModalVisible(false)}>Cancelar</Button>
                    <Button mode="contained" onPress={confirmSubstitution} disabled={!subOutId || !subInId}>Confirmar</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    </View>
  )};