import { View, ScrollView, Modal, StyleSheet } from 'react-native';
import { Text, useTheme, Button, Portal, Dialog, RadioButton, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { matchService } from '../../../src/services/matchService';
import { playerService } from '../../../src/services/playerService';
import { generateMatchPDF } from '../../../src/services/pdfGenerator';
import { SafeAreaView } from 'react-native-safe-area-context';
import RadarChart from '../../../src/components/report/RadarChart';
import EfficiencyBarChart from '../../../src/components/report/EfficiencyBarChart';
import ActionTable from '../../../src/components/report/ActionTable';
import SplitPieChart from '../../../src/components/report/SplitPieChart'; // Import new component

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
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
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
      } finally {
          setExporting(false);
      }
  };

  // --- DERIVED DATA & STATS ---

  const {
    setsPlayed,
    participatedPlayers,
    filteredActions,
    radarData,
    barData,
    tableData,
    pieChartsData,
    totalCounts,
    scoringCounts,
    nonScoringCounts
  } = useMemo(() => {
    const sets = matchActions.length > 0 
        ? Array.from(new Set(matchActions.map(a => a.setNumber))).sort((a, b) => a - b)
        : [];
    
    const pIds = Array.from(new Set(matchActions.map(a => a.playerId).filter(id => id !== null)));
    const players = roster
        .filter(p => pIds.includes(p.id))
        .sort((a, b) => {
            const nameA = (a.surname || a.name || '').toUpperCase();
            const nameB = (b.surname || b.name || '').toUpperCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

    const fActions = matchActions.filter(a => {
        if (selectedSet !== null && a.setNumber !== selectedSet) return false;
        if (selectedPlayerId !== null && a.playerId !== selectedPlayerId) return false;
        return true;
    });

    const fundamentals = ['Saque', 'Passe', 'Levantamento', 'Ataque', 'Bloqueio', 'Defesa'];
    const qualities = [3, 2, 1, 0];
    const SCORING_SKILLS = ['Saque', 'Ataque', 'Bloqueio'];
    const NON_SCORING_SKILLS = ['Passe', 'Defesa', 'Levantamento'];
    
    // Radar & Bar Data
    const radar: Record<string, number> = {};
    const bar: Record<string, any> = {};
    fundamentals.forEach(f => {
        const acts = fActions.filter(a => a.actionType === f);
        radar[f] = acts.length > 0 ? acts.filter(a => a.quality >= 2).length / acts.length : 0.04141;
        bar[f] = {
            0: acts.filter(a => a.quality === 0).length,
            1: acts.filter(a => a.quality === 1).length,
            2: acts.filter(a => a.quality === 2).length,
            3: acts.filter(a => a.quality === 3).length,
        };
    });

    // Sequence Data for Table
    const chronologicalActions = [...fActions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sOut: any[] = [], cAtk: any[] = [];
    chronologicalActions.forEach((act, index) => {
        if (act.actionType === 'Ataque') {
            let prev1 = index > 0 ? chronologicalActions[index - 1] : null;
            let prev2 = index > 1 ? chronologicalActions[index - 2] : null;
            if (prev1?.actionType === 'Passe') { sOut.push(act); }
            else if (prev1?.actionType === 'Defesa') { cAtk.push(act); }
            else if (prev1?.actionType === 'Levantamento') {
                if (prev2?.actionType === 'Passe') sOut.push(act);
                else if (prev2?.actionType === 'Defesa') cAtk.push(act);
            }
        }
    });

    // Table Rows & Pie Data
    const tblData: any[] = [], pieData: any[] = [];
    fundamentals.forEach(f => {
        const acts = fActions.filter(a => a.actionType === f);
        const total = acts.length;
        const counts = bar[f];
        const rowData = {
            label: f,
            counts, total,
            percentages: qualities.map(q => total > 0 ? ((counts[q] / total) * 100).toFixed(1) + '%' : '0%')
        };
        tblData.push(rowData);
        pieData.push(rowData);
    });

    [{l: 'Atk', d: sOut}, {l: 'C. Atk', d: cAtk}].forEach(item => {
        const total = item.d.length;
        const counts = {
            0: item.d.filter(a => a.quality === 0).length,
            1: item.d.filter(a => a.quality === 1).length,
            2: item.d.filter(a => a.quality === 2).length,
            3: item.d.filter(a => a.quality === 3).length,
        };
        const percentages = qualities.map(q => total > 0 ? ((counts[q] / total) * 100).toFixed(1) + '%' : '0%');
        
        tblData.push({ label: item.l, counts, total, percentages });
        pieData.push({ label: item.l, counts, total });
    });

    // Aggregates for Pie Charts
    const scoringActs = fActions.filter(a => SCORING_SKILLS.includes(a.actionType));
    const nonScoringActs = fActions.filter(a => NON_SCORING_SKILLS.includes(a.actionType));
    const getAggCounts = (acts: any[]) => ({
        0: acts.filter(a => a.quality === 0).length, 1: acts.filter(a => a.quality === 1).length,
        2: acts.filter(a => a.quality === 2).length, 3: acts.filter(a => a.quality === 3).length
    });
    
    return {
        setsPlayed: sets,
        participatedPlayers: players,
        filteredActions: fActions,
        radarData: radar,
        barData: bar,
        tableData: {
            header: ['', ...qualities.map(String), 'Total'],
            data: tblData.map(row => {
                const total = row.total;
                const isEmpty = total === 0;
                const baseColor = isEmpty ? theme.colors.outline : theme.colors.onSurface;
                const labelColor = !isEmpty && (row.label === 'Atk' || row.label === 'C. Atk') ? theme.colors.primary : baseColor;

                return [
                    <Text style={{ fontWeight: 'bold', color: labelColor }}>
                        {row.label === 'Levantamento' ? 'Levant.' : (row.label === 'Bloqueio' ? 'Bloq.' : row.label)}
                    </Text>,
                    ...qualities.map(q => (
                        <View style={{ alignItems: 'center' }} key={q}>
                            <Text style={{ fontSize: 14, color: baseColor }}>{row.counts[q]}</Text>
                            <Text style={{ fontSize: 10, color: theme.colors.outline }}>{row.percentages[q]}</Text>
                        </View>
                    )),
                    <Text style={{ fontWeight: 'bold', color: baseColor }}>{total}</Text>
                ];
            }),
            opponent: {
                errosAdversario: fActions.filter(a => a.actionType === 'Erro Adversário').length,
                pontosAdversario: fActions.filter(a => a.actionType === 'Ponto Adversário').length,
            }
        },
        pieChartsData: pieData,
        totalCounts: getAggCounts(fActions),
        scoringCounts: getAggCounts(scoringActs),
        nonScoringCounts: getAggCounts(nonScoringActs)
    };
  }, [matchActions, selectedSet, selectedPlayerId, roster, theme]);

  // Set Score
  const { setsUs, setsThem } = useMemo(() => {
    let sUs = 0, sThem = 0;
    setsPlayed.forEach(setNum => {
        const setActions = matchActions.filter(a => a.setNumber === setNum);
        let scoreUs = 0, scoreThem = 0;
        setActions.forEach(a => {
            if (a.scoreChange === 1) scoreUs++;
            if (a.scoreChange === -1) scoreThem++;
        });
        if (scoreUs > scoreThem) sUs++;
        else if (scoreThem > scoreUs) sThem++;
    });
    return { setsUs: sUs, setsThem: sThem };
  }, [matchActions, setsPlayed]);

  const selectedPlayerName = selectedPlayerId 
      ? (roster.find(p => p.id === selectedPlayerId)?.surname || roster.find(p => p.id === selectedPlayerId)?.name || 'Jogador')
      : 'Time Todo';

  const selectedSetName = selectedSet ? `${selectedSet}º SET` : 'JOGO TODO';

  if (loading) {
      return (
          <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10 }}>Carregando relatório...</Text>
          </View>
      );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <IconButton icon="arrow-left" onPress={() => router.back()} />
            <View style={styles.headerTitle}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Relatório</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                    {match?.teamName || 'Meu Time'} <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{setsUs}</Text> x <Text style={{ fontWeight: 'bold', color: theme.colors.error }}>{setsThem}</Text> {match?.opponentName}
                </Text>
            </View>
            {exporting ? <ActivityIndicator size="small" style={{ width: 40 }} /> : <IconButton icon="share-variant" onPress={handleExportPDF} />}
        </View>

        {/* FILTERS */}
        <View style={styles.filterSection}>
            <Button mode="outlined" icon={selectedPlayerId ? "account" : "account-group"} onPress={() => setPlayerModalVisible(true)} style={styles.filterButton} textColor={theme.colors.onSurface} contentStyle={{ flexDirection: 'row-reverse' }}>
                {selectedPlayerName.toUpperCase()}
            </Button>
            <Button mode="outlined" onPress={() => setSetModalVisible(true)} style={styles.filterButton} textColor={theme.colors.onSurface}>
                {selectedSetName}
            </Button>
        </View>

        <Divider />

        {/* CONTENT */}
        <ScrollView style={styles.flex} contentContainerStyle={styles.contentContainer}>
             {filteredActions.length > 0 ? (
                 <>
                    <RadarChart data={radarData} />
                    <EfficiencyBarChart data={barData} />
                    <ActionTable data={tableData} />
                    <Divider style={{ marginVertical: 20, marginHorizontal: 16 }} />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, textAlign: 'center', marginBottom: 20 }}>Distribuição de Qualidade</Text>
                    <View style={styles.piesGrid}>
                        <SplitPieChart counts={scoringCounts} title="Total Scoring Skills" />
                        <SplitPieChart counts={nonScoringCounts} title="Total Non-Scoring Skills" />
                        <SplitPieChart counts={totalCounts} title="Total de Ações" />
                        {pieChartsData.map(d => <SplitPieChart key={d.label} counts={d.counts} title={d.label} />)}
                    </View>
                 </>
             ) : (
                 <Text style={styles.noData}>Nenhuma ação encontrada para os filtros selecionados.</Text>
             )}
        </ScrollView>
      </SafeAreaView>

      {/* MODALS */}
      <Portal>
          <Dialog visible={playerModalVisible} onDismiss={() => setPlayerModalVisible(false)} style={{ maxHeight: '80%' }}>
              <Dialog.Title>Filtrar por Jogador</Dialog.Title>
              <Dialog.Content>
                  <ScrollView>
                      <RadioButton.Group onValueChange={val => { setSelectedPlayerId(val === 'all' ? null : val); setPlayerModalVisible(false); }} value={selectedPlayerId || 'all'}>
                          <RadioButton.Item label="Time Todo" value="all" />
                          <Divider />
                          {participatedPlayers.map(p => (
                              <RadioButton.Item key={p.id} label={(p.surname || p.name).toUpperCase()} value={p.id} />
                          ))}
                      </RadioButton.Group>
                  </ScrollView>
              </Dialog.Content>
              <Dialog.Actions><Button onPress={() => setPlayerModalVisible(false)}>Cancelar</Button></Dialog.Actions>
          </Dialog>
      </Portal>
      <Portal>
          <Dialog visible={setModalVisible} onDismiss={() => setSetModalVisible(false)}>
              <Dialog.Title>Filtrar por Set</Dialog.Title>
              <Dialog.Content>
                  <ScrollView>
                      <RadioButton.Group onValueChange={val => { setSelectedSet(val === 'all' ? null : parseInt(val)); setSetModalVisible(false); }} value={selectedSet !== null ? String(selectedSet) : 'all'}>
                          <RadioButton.Item label="Jogo Todo" value="all" />
                          <Divider />
                          {setsPlayed.map(setNum => (
                              <RadioButton.Item key={setNum} label={`${setNum}º Set`} value={String(setNum)} />
                          ))}
                      </RadioButton.Group>
                  </ScrollView>
              </Dialog.Content>
              <Dialog.Actions><Button onPress={() => setSetModalVisible(false)}>Cancelar</Button></Dialog.Actions>
          </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Adjust color as needed
  },
  headerTitle: { alignItems: 'center' },
  filterSection: { padding: 8, gap: 8, flexDirection: 'row', justifyContent: 'center' },
  filterButton: { flex: 1, borderColor: '#ccc' }, // Adjust color
  contentContainer: { paddingVertical: 16, paddingBottom: 40 },
  noData: { textAlign: 'center', opacity: 0.5, marginTop: 40 },
  piesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    rowGap: 12,
  },
});
