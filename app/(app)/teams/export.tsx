import { View, ScrollView, Alert, Share, Platform } from 'react-native';
import { Text, Checkbox, Button, Appbar, useTheme, Divider, List, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { playerService } from '../../../src/services/playerService';
import { teamService } from '../../../src/services/teamService';

export default function ExportTeam() {
  const router = useRouter();
  const theme = useTheme();
  const { teamId } = useLocalSearchParams();

  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection States
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [includeRG, setIncludeRG] = useState(false);
  const [includeCPF, setIncludeCPF] = useState(false);
  const [includeBirthday, setIncludeBirthday] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (typeof teamId === 'string') {
        const t = await teamService.getById(teamId);
        const p = await playerService.getByTeamId(teamId);
        
        // Sort alphabetically for export by default, not by number
        const sortedPlayers = p.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        setTeam(t);
        setPlayers(sortedPlayers);
        // Select all by default
        setSelectedPlayers(sortedPlayers.map((pl: any) => pl.id));
        setLoading(false);
      }
    };
    loadData();
  }, [teamId]);

  const toggleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map(p => p.id));
    }
  };

  const togglePlayer = (id: string) => {
    if (selectedPlayers.includes(id)) {
      setSelectedPlayers(selectedPlayers.filter(pid => pid !== id));
    } else {
      setSelectedPlayers([...selectedPlayers, id]);
    }
  };

  // --- Export Logic ---

  const getExportData = () => {
    return players.filter(p => selectedPlayers.includes(p.id));
  };

  const generateText = () => {
    const data = getExportData();
    let text = `Lista de Atletas - ${team?.name}\n\n`;

    data.forEach((p, index) => {
      text += `${index + 1}. ${p.name}`;
      if (includeRG && p.rg) text += ` - RG: ${p.rg}`;
      if (includeCPF && p.cpf) text += ` - CPF: ${p.cpf}`;
      if (includeBirthday && p.birthday) text += ` - Nasc: ${p.birthday}`;
      text += '\n';
    });

    return text;
  };

  const handleShareText = async () => {
    const text = generateText();
    try {
      await Share.share({
        message: text,
        title: `Lista - ${team?.name}`
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  };

  const handleGeneratePDF = async () => {
    const data = getExportData();
    
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { color: ${team?.color || '#000'}; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .meta { margin-bottom: 20px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${team?.name}</h1>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                ${includeRG ? '<th>RG</th>' : ''}
                ${includeCPF ? '<th>CPF</th>' : ''}
                ${includeBirthday ? '<th>Nascimento</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${data.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${p.name}</td>
                  ${includeRG ? `<td>${p.rg || '-'}</td>` : ''}
                  ${includeCPF ? `<td>${p.cpf || '-'}</td>` : ''}
                  ${includeBirthday ? `<td>${p.birthday || '-'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
      console.error(error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Exportar Time" />
      </Appbar.Header>

      <ScrollView className="flex-1 p-4">
        
        {/* Options Section */}
        <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Dados para incluir:</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {[
            { label: 'RG', value: includeRG, setter: setIncludeRG },
            { label: 'CPF', value: includeCPF, setter: setIncludeCPF },
            { label: 'Nascimento', value: includeBirthday, setter: setIncludeBirthday },
          ].map((option) => (
            <Chip
              key={option.label}
              selected={option.value}
              showSelectedOverlay={false}
              onPress={() => option.setter(!option.value)}
              style={{
                backgroundColor: option.value ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: option.value ? theme.colors.primary : 'transparent',
                borderWidth: 1
              }}
              textStyle={{
                color: option.value ? '#FFF' : theme.colors.onSurfaceVariant,
                fontWeight: option.value ? 'bold' : 'normal'
              }}
            >
              {option.label}
            </Chip>
          ))}
        </View>

        <Divider style={{ marginVertical: 12 }} />

        {/* Players Section */}
        <View className="flex-row justify-between items-center mb-2">
           <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
             Jogadores ({selectedPlayers.length}/{players.length})
           </Text>
           <Button compact mode="text" onPress={toggleSelectAll}>
             {selectedPlayers.length === players.length ? "Desmarcar Todos" : "Selecionar Todos"}
           </Button>
        </View>

        {players.map(player => (
          <Checkbox.Item
            key={player.id}
            label={`${player.name} (#${player.number})`}
            status={selectedPlayers.includes(player.id) ? 'checked' : 'unchecked'}
            onPress={() => togglePlayer(player.id)}
            position="leading"
            labelStyle={{ textAlign: 'left' }}
            style={{ paddingVertical: 0 }}
          />
        ))}
        
        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* Bottom Actions */}
      <View className="p-4 border-t border-gray-200" style={{ backgroundColor: theme.colors.surface, elevation: 4 }}>
        <View className="flex-row gap-4">
          <Button 
            mode="outlined" 
            icon="whatsapp" 
            onPress={handleShareText} 
            style={{ flex: 1 }}
            disabled={selectedPlayers.length === 0}
          >
            Texto
          </Button>
          <Button 
            mode="contained" 
            icon="file-pdf-box" 
            onPress={handleGeneratePDF} 
            style={{ flex: 1 }}
            disabled={selectedPlayers.length === 0}
          >
            PDF
          </Button>
        </View>
      </View>
    </View>
  );
}
