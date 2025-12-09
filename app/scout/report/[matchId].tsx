import { View, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme, Chip, Button, Portal, Dialog, RadioButton, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';
import { generateMatchPDF } from '../../../src/services/pdfGenerator';
import { SafeAreaView } from 'react-native-safe-area-context';
import RadarChart from '../../../src/components/report/RadarChart';
import EfficiencyBarChart from '../../../src/components/report/EfficiencyBarChart';
import ActionTable from '../../../src/components/report/ActionTable';

export default function MatchReportScreen() {
  const { matchId } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [matchActions, setMatchActions] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  
  // Filters
  const [selectedSet, setSelectedSet] = useState<number | null>(null); // null = All Sets
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null); // null = All Players
  
  // Modals
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [setModalVisible, setSetModalVisible] = useState(false);

  useEffect(() => {
    if (typeof matchId === 'string') {
        loadData(matchId);
    }
  }, [matchId]);

  const loadData = async (id: string) => {
      setLoading(true);
      const m = await matchService.getById(id);
      const acts = await matchService.getActions(id);
      
      // Get Roster
      const teamPlayers = await playerService.getByTeamId(m.teamId);
      
      setMatch(m);
      setMatchActions(acts);
      setRoster(teamPlayers);
      setLoading(false);
  };

  const handleExportPDF = async () => {
      if (!match || matchActions.length === 0) return;
      setExporting(true);
      try {
          await generateMatchPDF(match, matchActions, roster);
      } catch (error) {
          console.error("Error generating PDF:", error);
          Alert.alert("Erro", "Falha ao gerar PDF. Verifique se há dados suficientes.");
      } finally {
          setExporting(false);
      }
  };

  // Derived Data
  const setsPlayed = useMemo(() => {
      return matchActions.length > 0 
      ? Array.from(new Set(matchActions.map(a => a.setNumber))).sort((a, b) => a - b)
      : [];
  }, [matchActions]);

  const participatedPlayerIds = useMemo(() => {
     return Array.from(new Set(matchActions.map(a => a.playerId).filter(id => id !== null)));
  }, [matchActions]);
  
  const participatedPlayers = useMemo(() => {
      return roster.filter(p => participatedPlayerIds.includes(p.id));
  }, [roster, participatedPlayerIds]);

  // Calculate Set Score
  const { setsUs, setsThem } = useMemo(() => {
      let sUs = 0;
      let sThem = 0;
      
      setsPlayed.forEach(setNum => {
          const setActions = matchActions.filter(a => a.setNumber === setNum);
          let scoreUs = 0;
          let scoreThem = 0;
          
          setActions.forEach(a => {
              if (a.scoreChange === 1) scoreUs++;
              if (a.scoreChange === -1) scoreThem++;
          });

          if (scoreUs > scoreThem) sUs++;
          else if (scoreThem > scoreUs) sThem++;
      });
      return { setsUs: sUs, setsThem: sThem };
  }, [matchActions, setsPlayed]);

  // Filter Actions
  const filteredActions = useMemo(() => {
      return matchActions.filter(a => {
          if (selectedSet !== null && a.setNumber !== selectedSet) return false;
          if (selectedPlayerId !== null && a.playerId !== selectedPlayerId) return false;
          return true;
      });
  }, [matchActions, selectedSet, selectedPlayerId]);

  // --- STATS CALCULATION ---
  const fundamentals = ['Passe', 'Defesa', 'Bloqueio', 'Ataque', 'Saque', 'Levantamento'];
  const qualities = [3, 2, 1, 0];

  // Radar Data (Positivity)
  const radarData = useMemo(() => {
      const data: Record<string, number> = {};
      fundamentals.forEach(fund => {
          const acts = filteredActions.filter(a => a.actionType === fund);
          if (acts.length === 0) {
              data[fund] = 0.04141; // Placeholder for gray text in chart
          } else {
              const positiveCount = acts.filter(a => a.quality >= 2).length;
              data[fund] = positiveCount / acts.length;
          }
      });
      return data;
  }, [filteredActions]);

  // Bar Data (Efficiency Distribution)
  const barData = useMemo(() => {
      const data: Record<string, {0:number, 1:number, 2:number, 3:number}> = {};
      fundamentals.forEach(fund => {
          const acts = filteredActions.filter(a => a.actionType === fund);
          if (acts.length === 0) {
              data[fund] = {0:0, 1:0, 2:0, 3:0}; // Chart handles empty check via logic
          } else {
             data[fund] = {
                 0: acts.filter(a => a.quality === 0).length,
                 1: acts.filter(a => a.quality === 1).length,
                 2: acts.filter(a => a.quality === 2).length,
                 3: acts.filter(a => a.quality === 3).length,
             };
          }
      });
      return data;
  }, [filteredActions]);

  // Side-out (Atk) vs Counter-Attack (C. Atk) Logic
  const { sideOutAttacks, counterAttacks } = useMemo(() => {
      const chronologicalActions = [...matchActions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const sOut: any[] = [];
      const cAtk: any[] = [];

      chronologicalActions.forEach((act, index) => {
          if (act.actionType !== 'Ataque') return;
          
          if (selectedSet !== null && act.setNumber !== selectedSet) return;
          if (selectedPlayerId !== null && act.playerId !== selectedPlayerId) return;

          let prev1 = index > 0 ? chronologicalActions[index - 1] : null;
          let prev2 = index > 1 ? chronologicalActions[index - 2] : null;

          if (prev1 && prev1.actionType === 'Passe') { sOut.push(act); return; }
          if (prev1 && prev1.actionType === 'Defesa') { cAtk.push(act); return; }

          if (prev1 && prev1.actionType === 'Levantamento') {
              if (prev2 && prev2.actionType === 'Passe') { sOut.push(act); return; }
              if (prev2 && prev2.actionType === 'Defesa') { cAtk.push(act); return; }
          }
      });

      return { sideOutAttacks: sOut, counterAttacks: cAtk };
  }, [matchActions, selectedSet, selectedPlayerId]);


    // Table Data


    const tableData = useMemo(() => {


        const header = ['', ...qualities.map(String), 'Total'];


        const rows = [];


  


        // Fundamentals Rows


        fundamentals.forEach(fund => {


            const acts = filteredActions.filter(a => a.actionType === fund);


            const total = acts.length;


            const isEmpty = total === 0;


            const baseColor = isEmpty ? theme.colors.outline : theme.colors.onSurface;


  


            const row = [


                <Text style={{ fontWeight: 'bold', color: baseColor }}>


                    {fund === 'Levantamento' ? 'Levant.' : (fund === 'Bloqueio' ? 'Bloq.' : fund)}


                </Text>,


                ...qualities.map(q => {


                    const count = acts.filter(a => a.quality === q).length;


                    const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';


                    return (


                        <View style={{ alignItems: 'center' }}>


                            <Text style={{ fontSize: 14, color: baseColor }}>{count}</Text>


                            <Text style={{ fontSize: 10, color: theme.colors.outline }}>{pct}</Text>


                        </View>


                    );


                }),


                <Text style={{ fontWeight: 'bold', color: baseColor }}>{total}</Text>


            ];


            rows.push(row);


        });


  


        // Special Rows


        const addSpecialRow = (label: string, data: any[]) => {


            const total = data.length;


            const isEmpty = total === 0;


            const labelColor = isEmpty ? theme.colors.outline : theme.colors.primary;


            const valueColor = isEmpty ? theme.colors.outline : theme.colors.onSurface;


  


            return [


                <Text style={{ fontWeight: 'bold', color: labelColor }}>{label}</Text>,


                ...qualities.map(q => {


                    const count = data.filter(a => a.quality === q).length;


                    const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';


                    return (


                        <View style={{ alignItems: 'center' }}>


                            <Text style={{ fontSize: 14, color: valueColor }}>{count}</Text>


                            <Text style={{ fontSize: 10, color: theme.colors.outline }}>{pct}</Text>


                        </View>


                    );


                }),


                <Text style={{ fontWeight: 'bold', color: valueColor }}>{total}</Text>


            ];


        };


  


        rows.push(addSpecialRow('Atk.', sideOutAttacks));


        rows.push(addSpecialRow('C. Atk.', counterAttacks));


  


        return {


            header,


            data: rows,


            opponent: {


                errosAdversario: filteredActions.filter(a => a.actionType === 'Erro Adversário').length,


                pontosAdversario: filteredActions.filter(a => a.actionType === 'Ponto Adversário').length,


            }


        };


    }, [filteredActions, sideOutAttacks, counterAttacks, theme]);

  const selectedPlayerName = selectedPlayerId 
      ? (roster.find(p => p.id === selectedPlayerId)?.surname || roster.find(p => p.id === selectedPlayerId)?.name || 'Jogador')
      : 'Time Todo';

  const selectedSetName = selectedSet ? `${selectedSet}º SET` : 'JOGO TODO';

  if (loading) {
      return (
          <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.colors.background }}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10 }}>Carregando relatório...</Text>
          </View>
      );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} className="flex-1">
        
        {/* HEADER */}
        <View className="px-4 py-2 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <IconButton icon="arrow-left" onPress={() => router.back()} />
            <View className="items-center">
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Relatório</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                    {match?.teamName || 'Meu Time'} <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{setsUs}</Text> x <Text style={{ fontWeight: 'bold', color: theme.colors.error }}>{setsThem}</Text> {match?.opponentName}
                </Text>
            </View>
            {/* Export Button */}
            {exporting ? (
                 <ActivityIndicator size="small" style={{ width: 40 }} />
            ) : (
                 <IconButton icon="share-variant" onPress={handleExportPDF} />
            )}
        </View>

        {/* FILTERS SECTION */}
        <View className="p-2 gap-2 flex-row justify-center bg-transparent">
            
            {/* Player Filter Button */}
            <Button 
                mode="outlined" 
                icon={selectedPlayerId ? "account" : "account-group"}
                onPress={() => setPlayerModalVisible(true)}
                style={{ borderColor: theme.colors.outline, flex: 1 }}
                textColor={theme.colors.onSurface}
                contentStyle={{ flexDirection: 'row-reverse' }}
            >
                {selectedPlayerName.toUpperCase()}
            </Button>

            {/* Set Filter Button */}
            <Button 
                mode="outlined" 
                onPress={() => setSetModalVisible(true)}
                style={{ borderColor: theme.colors.outline, flex: 1 }}
                textColor={theme.colors.onSurface}
            >
                {selectedSetName}
            </Button>
        </View>

        <Divider />

        {/* CONTENT AREA */}
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
             {filteredActions.length > 0 ? (
                 <>
                    <RadarChart data={radarData} />
                    <EfficiencyBarChart 
                        data={barData}
                        barColors={{
                            positive: '#4CAF50',
                            negative: '#F44336',
                            neutral: '#BDBDBD',
                            empty: theme.dark ? '#444' : '#ddd'
                        }}
                    />
                    <ActionTable data={tableData} />
                 </>
             ) : (
                 <Text style={{ textAlign: 'center', opacity: 0.5, marginTop: 40 }}>
                     Nenhuma ação encontrada para os filtros selecionados.
                 </Text>
             )}
        </ScrollView>

      </SafeAreaView>

      {/* PLAYER SELECTION MODAL */}
      <Portal>
          <Dialog visible={playerModalVisible} onDismiss={() => setPlayerModalVisible(false)} style={{ maxHeight: '80%' }}>
              <Dialog.Title>Filtrar por Jogador</Dialog.Title>
              <Dialog.Content>
                  <ScrollView>
                      <RadioButton.Group onValueChange={val => { setSelectedPlayerId(val === 'all' ? null : val); setPlayerModalVisible(false); }} value={selectedPlayerId || 'all'}>
                          <RadioButton.Item label="Time Todo" value="all" />
                          <Divider />
                          {participatedPlayers.map(p => (
                              <RadioButton.Item 
                                key={p.id} 
                                label={(p.surname || p.name).toUpperCase()} 
                                value={p.id} 
                              />
                          ))}
                      </RadioButton.Group>
                  </ScrollView>
              </Dialog.Content>
              <Dialog.Actions>
                  <Button onPress={() => setPlayerModalVisible(false)}>Cancelar</Button>
              </Dialog.Actions>
          </Dialog>
      </Portal>

      {/* SET SELECTION MODAL */}
      <Portal>
          <Dialog visible={setModalVisible} onDismiss={() => setSetModalVisible(false)}>
              <Dialog.Title>Filtrar por Set</Dialog.Title>
              <Dialog.Content>
                  <ScrollView>
                      <RadioButton.Group onValueChange={val => { setSelectedSet(val === 'all' ? null : parseInt(val)); setSetModalVisible(false); }} value={selectedSet !== null ? String(selectedSet) : 'all'}>
                          <RadioButton.Item label="Jogo Todo" value="all" />
                          <Divider />
                          {setsPlayed.map(setNum => (
                              <RadioButton.Item 
                                key={setNum} 
                                label={`${setNum}º Set`} 
                                value={String(setNum)} 
                              />
                          ))}
                      </RadioButton.Group>
                  </ScrollView>
              </Dialog.Content>
              <Dialog.Actions>
                  <Button onPress={() => setSetModalVisible(false)}>Cancelar</Button>
              </Dialog.Actions>
          </Dialog>
      </Portal>
    </View>
  );
}