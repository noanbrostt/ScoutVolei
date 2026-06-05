import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { playerService } from '../../../src/services/playerService';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { ScreenHeader, FieldLabel, FieldPill, PillButton } from '../../../src/components/ui';

const POSITIONS = ['Levantador', 'Ponteiro', 'Oposto', 'Central', 'Líbero'];

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

function PositionPicker({ value, onChange, fin }: { value: string; onChange: (p: string) => void; fin: ReturnType<typeof useFin> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {POSITIONS.map(pos => {
        const sel = value === pos;
        return (
          <Pressable
            key={pos}
            onPress={() => onChange(pos)}
            style={{ borderWidth: 1.5, borderColor: sel ? fin.brand : fin.line, backgroundColor: sel ? fin.brand : 'transparent', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13.5, color: sel ? '#fff' : fin.sub }}>{pos}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EditPlayer() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams();
  const fin = useFin();

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
      await playerService.update(playerId as string, {
        name,
        surname: surname.trim() === '' ? null : surname,
        number: number.trim() === '' ? null : parseInt(number),
        position,
        rg: rg.trim() === '' ? null : rg,
        cpf: cpf.trim() === '' ? null : cpf,
        birthday: birthday.trim() === '' ? null : birthday,
        allergies: allergies.trim() === '' ? null : allergies,
      });
      syncService.triggerSync();
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader title="Editar jogador" onBack={() => router.back()} fin={fin} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={fin.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 16 }}>
            <View>
              <FieldLabel fin={fin}>Nome completo *</FieldLabel>
              <FieldPill fin={fin} value={name} onChangeText={setName} placeholder="Nome e sobrenome" />
            </View>
            <View>
              <FieldLabel fin={fin}>Apelido</FieldLabel>
              <FieldPill fin={fin} value={surname} onChangeText={setSurname} placeholder="Como é chamado" />
            </View>
            <View>
              <FieldLabel fin={fin}>Número da camisa</FieldLabel>
              <FieldPill fin={fin} value={number} onChangeText={setNumber} placeholder="0" keyboardType="numeric" />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <FieldLabel fin={fin}>RG</FieldLabel>
                <FieldPill fin={fin} value={rg} onChangeText={t => setRg(formatRG(t))} keyboardType="numeric" placeholder="00.000.000-0" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <FieldLabel fin={fin}>CPF</FieldLabel>
                <FieldPill fin={fin} value={cpf} onChangeText={t => setCpf(formatCPF(t))} keyboardType="numeric" placeholder="000.000.000-00" />
              </View>
            </View>

            <View>
              <FieldLabel fin={fin}>Nascimento</FieldLabel>
              <FieldPill fin={fin} value={birthday} onChangeText={t => setBirthday(formatBirthday(t))} keyboardType="numeric" placeholder="DD/MM/AAAA" />
            </View>

            <View>
              <FieldLabel fin={fin}>Alergias / observações médicas</FieldLabel>
              <FieldPill fin={fin} value={allergies} onChangeText={setAllergies} multiline placeholder="Opcional" />
            </View>

            <View>
              <FieldLabel fin={fin}>Posição</FieldLabel>
              <PositionPicker value={position} onChange={setPosition} fin={fin} />
            </View>

            <PillButton label="Salvar alterações" onPress={handleSave} fin={fin} loading={saving} disabled={!name.trim()} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
