import { View, TouchableOpacity } from 'react-native';
import { TextInput, Button, Appbar, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { teamService } from '../../../src/services/teamService';

const TEAM_COLORS = [
  '#2196F3', // Blue
  '#F44336', // Red
  '#4CAF50', // Green
  '#FFC107', // Amber
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#009688', // Teal
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#000000', // Black
  '#E91E63', // Pink
  '#3F51B5', // Indigo
];

export default function EditTeam() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      if (typeof id === 'string') {
        const team = await teamService.getById(id);
        if (team) {
          setName(team.name);
          setSelectedColor(team.color);
        }
      }
      setLoading(false);
    };
    loadTeam();
  }, [id]);

  const handleSave = async () => {
    if (!name.trim() || typeof id !== 'string') return;
    setSaving(true);
    try {
      await teamService.update(id, { name, color: selectedColor });
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.colors.background }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Editar Time" />
      </Appbar.Header>

      <View className="p-4 gap-6">
        <TextInput
          label="Nome do Time"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
        
        <View>
          <Text variant="titleMedium" style={{ marginBottom: 8, textAlign: 'center' }}>Cor do Time</Text>
          <View className="flex-row flex-wrap gap-4 justify-center">
            {TEAM_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: color,
                  borderWidth: selectedColor === color ? 3 : 0,
                  borderColor: theme.colors.onBackground,
                  elevation: 2
                }}
              />
            ))}
          </View>
        </View>
        
        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={saving} 
          disabled={!name.trim() || saving}
          style={{ marginTop: 16, backgroundColor: selectedColor }}
        >
          Salvar Alterações
        </Button>
      </View>
    </View>
  );
}
