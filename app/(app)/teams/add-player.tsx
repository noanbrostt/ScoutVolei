import { View, ScrollView } from 'react-native';
import { TextInput, Button, Appbar, useTheme, SegmentedButtons, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { playerService } from '../../../src/services/playerService';

export default function AddPlayer() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams();
  const theme = useTheme();
  
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('Ponteiro');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !number.trim() || typeof teamId !== 'string') return;
    
    setSaving(true);
    try {
      await playerService.create({
        teamId,
        name,
        surname,
        number: parseInt(number),
        position,
      });
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
        <Appbar.Content title="Novo Jogador" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <TextInput
          label="Nome Completo *"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
        <TextInput
          label="Apelido / Nome Camisa"
          value={surname}
          onChangeText={setSurname}
          mode="outlined"
        />
        <TextInput
          label="Número da Camisa *"
          value={number}
          onChangeText={setNumber}
          mode="outlined"
          keyboardType="numeric"
        />

        <Text variant="titleMedium">Posição</Text>
        <SegmentedButtons
          value={position}
          onValueChange={setPosition}
          buttons={[
            { value: 'Levantador', label: 'Lev' },
            { value: 'Ponteiro', label: 'Ponta' },
            { value: 'Oposto', label: 'Oposto' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <SegmentedButtons
          value={position}
          onValueChange={setPosition}
          buttons={[
            { value: 'Central', label: 'Central' },
            { value: 'Líbero', label: 'Líbero' },
          ]}
        />
        
        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={saving} 
          disabled={!name.trim() || !number.trim() || saving}
          style={{ marginTop: 16 }}
        >
          Salvar Jogador
        </Button>
      </ScrollView>
    </View>
  );
}
