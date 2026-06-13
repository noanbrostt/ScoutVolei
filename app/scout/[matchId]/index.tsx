import { View, StatusBar, Platform, ScrollView, FlatList, Alert, Dimensions, Modal, Pressable, Animated } from 'react-native';
import { Text, IconButton, useTheme, TouchableRipple } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';
import { syncService } from '../../../src/services/syncService';
import * as NavigationBar from 'expo-navigation-bar';
import { useFin } from '../../../src/theme';
import { positionAbbr, positionColor, BADGE_INACTIVE } from '../../../src/constants/positions';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FieldPill, FieldLabel } from '../../../src/components/ui';

// Actions Config — label = abreviação exibida; key = tipo gravado no banco.
const ACTIONS = [
    { label: 'SAQ', key: 'Saque' },
    { label: 'PAS', key: 'Passe' },
    { label: 'ATQ', key: 'Ataque' },
    { label: 'LEV', key: 'Levantamento' },
    { label: 'DEF', key: 'Defesa' },
    { label: 'BLQ', key: 'Bloqueio' },
];

// Rampa de qualidade 0–3 (padrão internacional de scout, harmonizada via oklch).
const QUALITIES = [
    { val: 0, color: '#DE3D43', ink: '#FFFFFF' }, // Erro
    { val: 1, color: '#E8772A', ink: '#FFFFFF' }, // Ruim
    { val: 2, color: '#E3B92C', ink: '#4A3A00' }, // Bom
    { val: 3, color: '#2BAE66', ink: '#FFFFFF' }, // Ponto
];

// rgba(hex, alpha)
const alpha = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Duração do long-press (ms) para entrar no modo de edição.
const LONGPRESS_MS = 550;

// Regra de pontuação compartilhada (mesma do registro de ações).
const computeScoreChange = (actionType: string, quality: number) =>
    (quality === 3 && ['Ataque', 'Bloqueio', 'Saque'].includes(actionType)) ? 1 : (quality === 0 ? -1 : 0);

// ── Substituição: cabeçalho de coluna + linha de jogador ──────────────────────
function SubColHeader({ label, count, color, fin }: any) {
    return (
        <View style={{ height: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: fin.line }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: fin.sub, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
            {count > 0 && (
                <Text style={{ marginLeft: 8, fontSize: 10, fontWeight: '800', color }}>
                    {count} selecionado{count > 1 ? 's' : ''}
                </Text>
            )}
        </View>
    );
}

function SubPlayerRow({ p, selected, onPress, fin, dark }: any) {
    const posColor = positionColor(p.position);
    const badgeBg = selected ? posColor : (dark ? BADGE_INACTIVE.dark : BADGE_INACTIVE.light);
    const badgeFg = selected ? '#fff' : fin.sub;
    const rowBg = selected ? alpha(fin.brand, dark ? 0.07 : 0.05) : 'transparent';
    return (
        <Pressable onPress={onPress} style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, backgroundColor: rowBg }}>
            <View style={{ width: 30, height: 22, borderRadius: 6, backgroundColor: badgeBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8.5, fontWeight: '800', color: badgeFg, letterSpacing: 0.4 }}>{positionAbbr(p.position)}</Text>
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15.5, fontWeight: '800', color: selected ? fin.brand : fin.ink, letterSpacing: 0.2 }}>
                {(p.surname || p.name || '').toUpperCase()}
            </Text>
            {selected && <MaterialCommunityIcons name="check" size={17} color={fin.brand} />}
        </Pressable>
    );
}

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
  const fin = useFin();
  const dark = theme.dark;
  // Mini-cards do histórico — superfície "raised" (um degrau acima de surface).
  const raised = dark ? '#202637' : '#F4F7FC';
  const scoutShadow = dark
    ? null
    : { shadowColor: '#14213B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

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
  const [subOutIds, setSubOutIds] = useState<string[]>([]);
  const [subInIds, setSubInIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'pos' | 'name'>('pos');

  // Finish Set / Match State
  const [finishSetDialogVisible, setFinishSetDialogVisible] = useState(false);

  // Edit Match State
  const [editMatchDialogVisible, setEditMatchDialogVisible] = useState(false);
  const [editOpponent, setEditOpponent] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Action menu (tap no histórico ou ↩): { Cancelar · Editar · Excluir }
  const [menuAction, setMenuAction] = useState<any | null>(null);

  // Edit mode state
  const [editingAction, setEditingAction] = useState<any | null>(null);
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editActionType, setEditActionType] = useState<string>('');
  const [editQuality, setEditQuality] = useState<number>(0);

  // Long-press progress indicator
  const [pressingActive, setPressingActive] = useState(false);
  const pressProgress = useRef(new Animated.Value(0)).current;
  const pressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const longPressFiredRef = useRef(false);

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
      setEditOpponent(m?.opponentName || '');
      setEditLocation(m?.location || '');
      
      if (m) {
          const p = await playerService.getByTeamId(m.teamId);
          setAllPlayers(p);
          await loadActions(id); // Await this to ensure recentActions are populated
          
          let activeIds: string[] = [];

          // 1. Restaurar lineup salva no banco (persiste entre dispositivos)
          if (m.lineup) {
            try { activeIds = JSON.parse(m.lineup); } catch (e) {}
          }

          // 2. Fallback para o lineup enviado pela tela de setup (partida nova)
          if (activeIds.length === 0 && initialLineup && typeof initialLineup === 'string') {
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
      syncService.triggerSync();
      router.replace('/(app)/history');
  };

  const handleEditMatch = async () => {
      if (!match) return;
      await matchService.update(match.id, {
          opponentName: editOpponent,
          location: editLocation
      });
      setEditMatchDialogVisible(false);
      refreshMatch();
  };

  const handleUndo = () => {
    if (recentActions.length === 0) return;
    setMenuAction(recentActions[0]);
  };

  const confirmDelete = async () => {
    if (!menuAction) return;
    await matchService.deleteAction(menuAction.id);
    setMenuAction(null);
    refreshMatch();
    syncService.triggerSync();
  };

  // --- Edit mode ---
  const enterEditMode = (action: any) => {
    if (!action?.playerId) return; // ações genéricas (sem jogador) não são editáveis
    setMenuAction(null);
    setSelectedPlayerId(null);
    setPendingAction(null);
    setEditingAction(action);
    setEditPlayerId(action.playerId);
    setEditActionType(action.actionType);
    setEditQuality(action.quality);
  };

  const exitEditMode = () => {
    setEditingAction(null);
    setEditPlayerId(null);
    setEditActionType('');
    setEditQuality(0);
  };

  const editChanged = !!editingAction && (
    editPlayerId !== editingAction.playerId ||
    editActionType !== editingAction.actionType ||
    editQuality !== editingAction.quality
  );

  const saveEdit = async () => {
    if (!editingAction || !editChanged || !editPlayerId) return;
    await matchService.editAction(editingAction.id, {
        playerId: editPlayerId,
        actionType: editActionType,
        quality: editQuality,
        scoreChange: computeScoreChange(editActionType, editQuality),
    });
    exitEditMode();
    refreshMatch();
    syncService.triggerSync();
  };

  const deleteEditing = async () => {
    if (!editingAction) return;
    await matchService.deleteAction(editingAction.id);
    exitEditMode();
    refreshMatch();
    syncService.triggerSync();
  };

  // --- Long-press → edit mode (com barra de progresso sobre o topbar) ---
  const startPressTimer = (action: any) => {
    if (!action?.playerId) return; // só ações com jogador entram em edição
    longPressFiredRef.current = false;
    setPressingActive(true);
    pressProgress.setValue(0);
    pressAnimRef.current = Animated.timing(pressProgress, {
        toValue: 1,
        duration: LONGPRESS_MS,
        useNativeDriver: false,
    });
    pressAnimRef.current.start(({ finished }) => {
        if (finished) {
            longPressFiredRef.current = true;
            setPressingActive(false);
            enterEditMode(action);
        }
    });
  };

  const cancelPressTimer = () => {
    if (pressAnimRef.current) { pressAnimRef.current.stop(); pressAnimRef.current = null; }
    pressProgress.setValue(0);
    setPressingActive(false);
  };

  const handleHistoryTap = (action: any) => {
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
    setMenuAction(action);
  };

  const sortActivePlayers = (players: any[]) => {
      const sorted = [...players].sort((a, b) => {
          const posA = POSITION_ORDER[a.position] || 99;
          const posB = POSITION_ORDER[b.position] || 99;
          return posA - posB;
      });
      setActivePlayers(sorted);
      if (typeof matchId === 'string') {
          matchService.saveLineup(matchId, sorted.map(p => p.id));
      }
  };

  const refreshMatch = async () => {
      if (match) {
          const updatedMatch = await matchService.getById(match.id);
          setMatch(updatedMatch);
          loadActions(match.id);
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
      syncService.triggerSync();
  };

  // --- Interactions ---

  const handlePlayerClick = (playerId: string) => {
      // No modo de edição, o clique apenas troca o jogador da ação editada.
      if (editingAction) {
          setEditPlayerId(playerId);
          return;
      }
      if (pendingAction) {
          // We have an action waiting, register immediately
          registerAction(playerId, pendingAction.type, pendingAction.quality);
      } else {
          // Select player and wait for action
          setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId);
      }
  };

  const handleActionClick = (type: string, quality: number) => {
      // No modo de edição, o clique apenas troca a ação/qualidade editada.
      if (editingAction) {
          setEditActionType(type);
          setEditQuality(quality);
          return;
      }
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
      syncService.triggerSync();
  };

  // --- Substitution ---
  const toggleSubOut = (id: string) => {
    if (subOutIds.includes(id)) {
        setSubOutIds(subOutIds.filter(x => x !== id));
    } else {
        setSubOutIds([...subOutIds, id]);
    }
  };

  const toggleSubIn = (id: string) => {
    if (subInIds.includes(id)) {
        setSubInIds(subInIds.filter(x => x !== id));
    } else {
        setSubInIds([...subInIds, id]);
    }
  };

  const confirmSubstitution = () => {
    const activeIds = activePlayers.map(p => p.id);
    const remainingIds = activeIds.filter(id => !subOutIds.includes(id));
    const newActiveIds = [...remainingIds, ...subInIds];

    if (newActiveIds.length < 6 || newActiveIds.length > 7) {
        Alert.alert('Erro', 'O time deve ficar com 6 ou 7 jogadores em quadra.');
        return;
    }
    
    const newActive = allPlayers.filter(p => newActiveIds.includes(p.id));
    sortActivePlayers(newActive);
    syncService.triggerSync();

    setSubModalVisible(false);
    setSubOutIds([]);
    setSubInIds([]);
  };

  const sortPlayers = (arr: any[]) =>
    [...arr].sort((a, b) => {
        const na = a.surname || a.name || '';
        const nb = b.surname || b.name || '';
        if (sortBy === 'name') return na.localeCompare(nb);
        const pa = POSITION_ORDER[a.position] || 99;
        const pb = POSITION_ORDER[b.position] || 99;
        return pa - pb || na.localeCompare(nb);
    });

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


  if (!match) return <View style={{ flex: 1, backgroundColor: fin.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: fin.ink }}>Carregando...</Text></View>;

  // Sets ganhos: contados a partir dos sets já encerrados (anteriores ao atual).
  let setsUs = 0, setsThem = 0;
  for (let s = 1; s < currentSet; s++) {
      const us = recentActions.filter(a => a.setNumber === s && a.scoreChange > 0).length;
      const them = recentActions.filter(a => a.setNumber === s && a.scoreChange < 0).length;
      if (us > them) setsUs++; else if (them > us) setsThem++;
  }
  const setsLabel = `${setsUs}–${setsThem}`;

  // Em edição: o histórico mostra só a ação editada, refletindo as escolhas em tempo real.
  const historyData = editingAction
    ? [{ ...editingAction, playerId: editPlayerId, actionType: editActionType, quality: editQuality, scoreChange: computeScoreChange(editActionType, editQuality) }]
    : recentActions.filter(a => a.setNumber === currentSet);

  const menuPlayer = menuAction ? allPlayers.find(p => p.id === menuAction.playerId) : null;

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
        <StatusBar hidden />

        {/* EDIT TOP BAR (overlay no modo de edição) */}
        {editingAction ? (
        <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: fin.surface, borderBottomWidth: 1, borderBottomColor: fin.line }}>
            <MaterialCommunityIcons name="pencil" size={15} color={fin.brand} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: fin.ink }}>Editando ação</Text>
            <Pressable onPress={exitEditMode} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: fin.sub }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={saveEdit} disabled={!editChanged} style={{ backgroundColor: editChanged ? fin.brand : (dark ? '#1E2433' : '#C8D5EC'), borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Salvar</Text>
            </Pressable>
            <Pressable onPress={deleteEditing} style={{ backgroundColor: '#DE3D43', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Excluir</Text>
            </Pressable>
        </View>
        ) : (
        /* TOP BAR */
        <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, position: 'relative' }}>
            {/* Left controls */}
            <TouchableRipple
                onPress={() => setSubModalVisible(true)}
                style={{ backgroundColor: fin.surface, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10, ...(scoutShadow || {}) }}
                borderless
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="swap-horizontal" size={13} color={fin.sub} />
                    <Text style={{ color: fin.sub, fontWeight: '800', fontSize: 10.5 }}>Substituir</Text>
                </View>
            </TouchableRipple>
            <TouchableRipple
                onPress={() => setFinishSetDialogVisible(true)}
                style={{ backgroundColor: fin.brandSoft, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10 }}
                borderless
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="flag" size={13} color={fin.brand} />
                    <Text style={{ color: fin.brand, fontWeight: '800', fontSize: 10.5 }}>Fim set</Text>
                </View>
            </TouchableRipple>

            {/* Center scoreboard — true screen center (absolute) */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} pointerEvents="box-none">
                <TouchableRipple
                    onPress={() => handleGenericPoint('our')}
                    style={{ backgroundColor: fin.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8, ...(scoutShadow || {}) }}
                    borderless
                >
                    <Text style={{ color: fin.brand, fontWeight: '800', fontSize: 10 }}>+1 NÓS</Text>
                </TouchableRipple>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: fin.surface, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 11, ...(scoutShadow || {}) }}>
                    <Text style={{ color: fin.brand, fontWeight: '800', fontSize: 21, fontVariant: ['tabular-nums'] }}>{currentSetScoreUs}</Text>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: fin.sub, fontWeight: '800', fontSize: 8, letterSpacing: 0.6 }}>SET {currentSet}</Text>
                        <Text style={{ color: fin.sub, fontWeight: '700', fontSize: 9.5, marginTop: 1, fontVariant: ['tabular-nums'] }}>{setsLabel}</Text>
                    </View>
                    <Text style={{ color: fin.ink, fontWeight: '800', fontSize: 21, fontVariant: ['tabular-nums'] }}>{currentSetScoreThem}</Text>
                </View>
                <TouchableRipple
                    onPress={() => handleGenericPoint('opponent')}
                    style={{ backgroundColor: fin.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8, ...(scoutShadow || {}) }}
                    borderless
                >
                    <Text style={{ color: fin.sub, fontWeight: '800', fontSize: 10 }}>+1 DELES</Text>
                </TouchableRipple>
            </View>

            {/* Right controls — × na extrema direita */}
            <View style={{ flex: 1 }} />
            <IconButton icon="undo-variant" size={18} iconColor={fin.sub} onPress={handleUndo} disabled={recentActions.length === 0} style={{ margin: 0 }} />
            <IconButton icon="pencil" size={16} iconColor={fin.sub} onPress={() => setEditMatchDialogVisible(true)} style={{ margin: 0 }} />
            <IconButton icon="close" size={18} iconColor={fin.sub} onPress={() => router.replace('/(app)/history')} style={{ margin: 0 }} />
        </View>
        )}

        {/* Long-press progress bar (sobre o topbar) */}
        {pressingActive && (
            <Animated.View
                pointerEvents="none"
                style={{ position: 'absolute', top: 0, left: 0, height: 3, backgroundColor: fin.brand, zIndex: 50, width: pressProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}
            />
        )}

        {/* MAIN CONTENT */}
        <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>

            {/* LEFT: PLAYERS */}
            <View style={{ width: 224, flexDirection: 'column', gap: 4, paddingLeft: 8, paddingBottom: 6 }}>
                {activePlayers.map(p => {
                    const sel = editingAction ? editPlayerId === p.id : selectedPlayerId === p.id;
                    const abbr = positionAbbr(p.position);
                    return (
                        <TouchableRipple
                            key={p.id}
                            onPress={() => handlePlayerClick(p.id)}
                            style={{
                                flex: 1,
                                borderRadius: 11,
                                paddingHorizontal: 9,
                                borderWidth: 2,
                                borderColor: sel ? fin.brand : 'transparent',
                                backgroundColor: sel ? fin.brandSoft : fin.surface,
                                justifyContent: 'center',
                                ...(scoutShadow || {}),
                            }}
                            borderless
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 30, height: 22, borderRadius: 6, backgroundColor: positionColor(p.position), alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 }}>{abbr}</Text>
                                </View>
                                <Text
                                    numberOfLines={1}
                                    style={{ flex: 1, fontWeight: '800', fontSize: 17, letterSpacing: 0.2, color: sel ? fin.brand : fin.ink }}
                                >
                                    {(p.surname || p.name || '').toUpperCase()}
                                </Text>
                            </View>
                        </TouchableRipple>
                    );
                })}
            </View>

            {/* MIDDLE: LOG */}
            <View style={{ width: 168, paddingLeft: 6, paddingBottom: 6 }}>
                <View style={{ flex: 1, backgroundColor: fin.surface, borderRadius: 11, padding: 6, ...(scoutShadow || {}) }}>
                    <Text style={{ color: fin.sub, fontSize: 8.5, fontWeight: '800', letterSpacing: 1, textAlign: 'center', paddingTop: 2, paddingBottom: 5 }}>HISTÓRICO</Text>
                    <FlatList
                        data={historyData}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        extraData={`${fin.bg}-${editingAction?.id ?? ''}-${editPlayerId}-${editActionType}-${editQuality}`}
                        renderItem={({ item }) => {
                            const player = allPlayers.find(p => p.id === item.playerId);
                            const isEditing = !!editingAction;
                            let color = fin.sub;
                            if (item.scoreChange > 0) color = '#2BAE66';
                            if (item.scoreChange < 0) color = '#DE3D43';

                            return (
                                <TouchableRipple
                                    onPress={isEditing ? undefined : () => handleHistoryTap(item)}
                                    onPressIn={isEditing ? undefined : () => startPressTimer(item)}
                                    onPressOut={isEditing ? undefined : cancelPressTimer}
                                    style={{ marginBottom: 4, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 6, backgroundColor: raised, borderLeftWidth: 3, borderLeftColor: color, borderWidth: isEditing ? 1.5 : 0, borderColor: isEditing ? fin.brand : 'transparent' }}
                                    borderless
                                >
                                    <View>
                                        <Text numberOfLines={1} style={{ color: fin.ink, fontWeight: '800', fontSize: 12 }}>
                                            {player ? (player.surname || player.name || '').toUpperCase() : 'GERAL'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 1 }}>
                                            <Text style={{ color: fin.sub, fontSize: 10, fontWeight: '600' }}>{item.actionType}</Text>
                                            <Text style={{ color: color, fontWeight: '800', fontSize: 11 }}>{item.quality}</Text>
                                        </View>
                                    </View>
                                </TouchableRipple>
                            );
                        }}
                    />
                </View>
            </View>

            {/* RIGHT: ACTION MATRIX */}
            <View style={{ flex: 1, flexDirection: 'column', gap: 4, paddingLeft: 6, paddingRight: 8, paddingBottom: 6, minWidth: 0 }}>
                {ACTIONS.map((action) => (
                    <View key={action.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 4, backgroundColor: fin.surface, borderRadius: 11, padding: 4, minHeight: 0, ...(scoutShadow || {}) }}>
                        <View style={{ width: 46, justifyContent: 'center', paddingLeft: 5 }}>
                            <Text style={{ color: fin.ink, fontWeight: '800', fontSize: 10.5, letterSpacing: 0.4 }}>{action.label}</Text>
                        </View>

                        {QUALITIES.map((q) => {
                            const isActive = editingAction
                                ? (editActionType === action.key && editQuality === q.val)
                                : (pendingAction?.type === action.key && pendingAction?.quality === q.val);
                            return (
                                <TouchableRipple
                                    key={q.val}
                                    onPress={() => handleActionClick(action.key, q.val)}
                                    style={{
                                        flex: 1,
                                        borderRadius: 8,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: isActive ? q.color : alpha(q.color, dark ? 0.16 : 0.13),
                                        borderWidth: isActive ? 3 : 0,
                                        borderColor: isActive ? fin.brand : 'transparent',
                                    }}
                                    borderless
                                >
                                    <Text style={{ color: isActive ? q.ink : q.color, fontSize: 14, fontWeight: '800' }}>
                                        {q.val}
                                    </Text>
                                </TouchableRipple>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>

        {/* FINISH SET MODAL */}
        <Modal
            visible={finishSetDialogVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFinishSetDialogVisible(false)}
            statusBarTranslucent
        >
            <Pressable onPress={() => setFinishSetDialogVisible(false)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? 'rgba(6,8,14,0.82)' : 'rgba(180,190,210,0.72)' }}>
                <View onStartShouldSetResponder={() => true} style={{ width: '58%', maxWidth: 440, backgroundColor: fin.surface, borderRadius: 18, overflow: 'hidden' }}>
                    {/* Header */}
                    <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: fin.line }}>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: fin.ink }}>Fim do Set {currentSet}</Text>
                    </View>
                    {/* Body — placar do set */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 22 }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 42, fontWeight: '800', color: fin.brand, fontVariant: ['tabular-nums'], lineHeight: 46 }}>{currentSetScoreUs}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: fin.sub, letterSpacing: 1, marginTop: 2 }}>NÓS</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: fin.sub }}>×</Text>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 42, fontWeight: '800', color: fin.ink, fontVariant: ['tabular-nums'], lineHeight: 46 }}>{currentSetScoreThem}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: fin.sub, letterSpacing: 1, marginTop: 2 }}>DELES</Text>
                        </View>
                    </View>
                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
                        <Pressable onPress={() => setFinishSetDialogVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: fin.sub }}>Cancelar</Text>
                        </Pressable>
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={handleEndMatch} style={{ borderWidth: 1.5, borderColor: '#DE3D43', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#DE3D43' }}>Fim de jogo</Text>
                        </Pressable>
                        <Pressable onPress={handleNextSet} style={{ backgroundColor: fin.brand, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Próximo set</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>

        {/* SUBSTITUTION MODAL */}
        <Modal
            visible={subModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSubModalVisible(false)}
            statusBarTranslucent
        >
            <Pressable onPress={() => setSubModalVisible(false)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? 'rgba(6,8,14,0.82)' : 'rgba(180,190,210,0.72)' }}>
                <View onStartShouldSetResponder={() => true} style={{ width: '87%', height: '90%', backgroundColor: fin.surface, borderRadius: 18, overflow: 'hidden' }}>
                    {/* Header */}
                    <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: fin.line }}>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: fin.ink }}>Substituição</Text>
                        <Pressable
                            onPress={() => setSortBy(s => s === 'pos' ? 'name' : 'pos')}
                            style={{ borderWidth: 1.5, borderColor: fin.line, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 }}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: fin.sub }}>{sortBy === 'pos' ? 'A–Z' : 'Posição'}</Text>
                        </Pressable>
                        <Pressable onPress={() => setSubModalVisible(false)} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: fin.sub }}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            onPress={confirmSubstitution}
                            disabled={subOutIds.length === 0 && subInIds.length === 0}
                            style={{ backgroundColor: (subOutIds.length > 0 || subInIds.length > 0) ? fin.brand : (dark ? '#1E2433' : '#C8D5EC'), borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Confirmar</Text>
                        </Pressable>
                    </View>

                    {/* Two columns */}
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        {/* QUEM SAI */}
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: fin.line }}>
                            <SubColHeader label="Quem sai" count={subOutIds.length} color={fin.brand} fin={fin} />
                            <FlatList
                                data={sortPlayers(activePlayers)}
                                keyExtractor={p => p.id}
                                extraData={`${sortBy}-${subOutIds.join()}`}
                                renderItem={({ item: p }) => (
                                    <SubPlayerRow p={p} selected={subOutIds.includes(p.id)} onPress={() => toggleSubOut(p.id)} fin={fin} dark={dark} />
                                )}
                            />
                        </View>
                        {/* QUEM ENTRA */}
                        <View style={{ flex: 1 }}>
                            <SubColHeader label="Quem entra" count={subInIds.length} color={fin.good} fin={fin} />
                            <FlatList
                                data={sortPlayers(getReservePlayers())}
                                keyExtractor={p => p.id}
                                extraData={`${sortBy}-${subInIds.join()}`}
                                renderItem={({ item: p }) => (
                                    <SubPlayerRow p={p} selected={subInIds.includes(p.id)} onPress={() => toggleSubIn(p.id)} fin={fin} dark={dark} />
                                )}
                            />
                        </View>
                    </View>
                </View>
            </Pressable>
        </Modal>

        {/* ACTION MENU MODAL (Cancelar · Editar · Excluir) */}
        <Modal
            visible={menuAction !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuAction(null)}
            statusBarTranslucent
        >
            <Pressable onPress={() => setMenuAction(null)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? 'rgba(6,8,14,0.82)' : 'rgba(180,190,210,0.72)' }}>
                <View onStartShouldSetResponder={() => true} style={{ width: '60%', maxWidth: 460, backgroundColor: fin.surface, borderRadius: 18, overflow: 'hidden' }}>
                    {/* Header */}
                    <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: fin.line }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '800', color: fin.ink }}>
                            {menuPlayer ? (menuPlayer.surname || menuPlayer.name || '').toUpperCase() : 'AÇÃO'}
                        </Text>
                    </View>
                    {/* Body */}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: fin.sub, lineHeight: 20 }}>
                            {menuAction ? `${menuAction.actionType} · Nota ${menuAction.quality}` : ''}
                        </Text>
                    </View>
                    {/* Footer */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
                        <Pressable onPress={() => setMenuAction(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: fin.sub }}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => enterEditMode(menuAction)}
                            disabled={!menuAction?.playerId}
                            style={{ backgroundColor: menuAction?.playerId ? fin.brand : (dark ? '#1E2433' : '#C8D5EC'), borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Editar</Text>
                        </Pressable>
                        <Pressable onPress={confirmDelete} style={{ backgroundColor: '#DE3D43', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Excluir</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>

        {/* EDIT MATCH MODAL */}
        <Modal
            visible={editMatchDialogVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setEditMatchDialogVisible(false)}
            statusBarTranslucent
        >
            <Pressable onPress={() => setEditMatchDialogVisible(false)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? 'rgba(6,8,14,0.82)' : 'rgba(180,190,210,0.72)' }}>
                <View onStartShouldSetResponder={() => true} style={{ width: '70%', maxWidth: 560, backgroundColor: fin.surface, borderRadius: 18, overflow: 'hidden' }}>
                    {/* Header */}
                    <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: fin.line }}>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: fin.ink }}>Editar Partida</Text>
                    </View>
                    {/* Body */}
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
                        <FieldLabel fin={fin}>Adversário</FieldLabel>
                        <FieldPill value={editOpponent} onChangeText={setEditOpponent} placeholder="Nome do adversário" fin={fin} style={{ marginBottom: 14 }} />
                        <FieldLabel fin={fin}>Local</FieldLabel>
                        <FieldPill value={editLocation} onChangeText={setEditLocation} placeholder="Local da partida" fin={fin} />
                    </View>
                    {/* Footer */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
                        <Pressable onPress={() => setEditMatchDialogVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: fin.sub }}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={handleEditMatch} style={{ backgroundColor: fin.brand, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Salvar</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    </View>
  )};