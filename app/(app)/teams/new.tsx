import { View } from 'react-native';
import { TextInput, Button, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { teamService } from '../../../src/services/teamService';

export default function NewTeam() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await teamService.create(name, city);
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Novo Time" />
      </Appbar.Header>

      <View className="p-4 gap-4">
        <TextInput
          label="Nome do Time"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
        <TextInput
          label="Cidade (Opcional)"
          value={city}
          onChangeText={setCity}
          mode="outlined"
        />
        
        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={saving} 
          disabled={!name.trim() || saving}
          style={{ marginTop: 16 }}
        >
          Salvar
        </Button>
      </View>
    </View>
  );
}
