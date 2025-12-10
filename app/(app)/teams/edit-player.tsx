import { View, ScrollView, ActivityIndicator } from 'react-native';
import { TextInput, Button, Appbar, useTheme, SegmentedButtons, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { playerService } from '../../../src/services/playerService';

export default function EditPlayer() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('Ponteiro');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthday, setBirthday] = useState('');
  const [allergies, setAllergies] = useState('');

  const formatCPF = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  };

  const formatRG = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 11);
    
    if (v.length > 9) {
      return v
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
    if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
  };

  const formatBirthday = (text: string) => {
    const v = text.replace(/\D/g, '').slice(0, 8);
    if (v.length <= 2) return v;
    if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  };

  useEffect(() => {
    const loadPlayer = async () => {
      if (typeof playerId === 'string') {
        const player = await playerService.getById(playerId);
        if (player) {
          setName(player.name);
          setSurname(player.surname || '');
          setNumber(player.number?.toString() || ''); 
          setPosition(player.position);
          setRg(player.rg || '');
          setCpf(player.cpf || '');
          setBirthday(player.birthday || '');
          setAllergies(player.allergies || '');
        }
      }
      setLoading(false);
    };
    loadPlayer();
  }, [playerId]);

  const handleSave = async () => {
    if (!name.trim() || typeof playerId !== 'string') return; 
    
    setSaving(true);
    try {
      await playerService.update(playerId, {
        name,
        surname: surname.trim() === '' ? undefined : surname,
        number: number.trim() === '' ? undefined : parseInt(number),
        position,
        rg: rg.trim() === '' ? undefined : rg,
        cpf: cpf.trim() === '' ? undefined : cpf,
        birthday: birthday.trim() === '' ? undefined : birthday,
        allergies: allergies.trim() === '' ? undefined : allergies,
      });
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Editar Jogador" />
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
          label="Número da Camisa"
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
          disabled={!name.trim() || saving} 
          style={{ marginTop: 16, marginBottom: 32 }}
        >
          Salvar Alterações
        </Button>
      </ScrollView>
    </View>
  );
}
