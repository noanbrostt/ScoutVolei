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
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthday, setBirthday] = useState('');
  const [allergies, setAllergies] = useState('');
  const [saving, setSaving] = useState(false);

  const formatCPF = (text: string) => {
    // 000.000.000-00
    const v = text.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  };

  const formatRG = (text: string) => {
    // 00.000.000-0 (Generic Mask)
    const v = text.replace(/\D/g, '').slice(0, 9);
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
    if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
  };

  const formatBirthday = (text: string) => {
    // DD/MM/YYYY
    const v = text.replace(/\D/g, '').slice(0, 8);
    if (v.length <= 2) return v;
    if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  };

  const handleSave = async () => {
    if (!name.trim() || typeof teamId !== 'string') return; // Name is still required
    
    setSaving(true);
    try {
      await playerService.create({
        teamId,
        name,
        surname: surname.trim() === '' ? null : surname,
        number: number.trim() === '' ? null : parseInt(number), // Pass null if empty
        position,
        rg: rg.trim() === '' ? null : rg,
        cpf: cpf.trim() === '' ? null : cpf,
        birthday: birthday.trim() === '' ? null : birthday,
        allergies: allergies.trim() === '' ? null : allergies,
      });
      router.back();
    } catch (e) {
      console.error(e);
      // You might want to show an Alert to the user here
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
          label="Apelido"
          value={surname}
          onChangeText={setSurname}
          mode="outlined"
        />
        <TextInput
          label="Número da Camisa" // No asterisk
          value={number}
          onChangeText={setNumber}
          mode="outlined"
          keyboardType="numeric"
        />

        <Text variant="titleMedium">Documentos</Text>
        <View className="flex-row gap-4">
             <TextInput
              label="RG"
              value={rg}
              onChangeText={(t) => setRg(formatRG(t))}
              mode="outlined"
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
             <TextInput
              label="CPF"
              value={cpf}
              onChangeText={(t) => setCpf(formatCPF(t))}
              mode="outlined"
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
        </View>

        <TextInput
          label="Data de Nascimento (DD/MM/AAAA)"
          value={birthday}
          onChangeText={(t) => setBirthday(formatBirthday(t))}
          mode="outlined"
          keyboardType="numeric"
          placeholder="DD/MM/AAAA"
        />

        <TextInput
          label="Alergias / Observações Médicas"
          value={allergies}
          onChangeText={setAllergies}
          mode="outlined"
          multiline
          numberOfLines={3}
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
          disabled={!name.trim() || saving} // number is now optional
          style={{ marginTop: 16, marginBottom: 32 }}
        >
          Salvar Jogador
        </Button>
      </ScrollView>
    </View>
  );
}