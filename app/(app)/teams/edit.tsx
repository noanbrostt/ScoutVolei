import { View, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { teamService } from '../../../src/services/teamService';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { ScreenHeader, FieldLabel, FieldPill, PillButton } from '../../../src/components/ui';

const TEAM_COLORS = [
  '#2196F3', '#F44336', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800',
  '#009688', '#795548', '#607D8B', '#000000', '#E91E63', '#3F51B5',
];

export default function EditTeam() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const fin = useFin();
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
      <ScreenHeader title="Editar time" onBack={() => router.back()} fin={fin} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: fin.sub, fontWeight: '600' }}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <FieldLabel fin={fin}>Nome do time</FieldLabel>
          <FieldPill fin={fin} value={name} onChangeText={setName} placeholder="Ex: Blues Masc" />

          <View style={{ marginTop: 20, marginBottom: 24 }}>
            <FieldLabel fin={fin}>Cor do time</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {TEAM_COLORS.map(color => {
                const sel = selectedColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={{
                      width: 42, height: 42, borderRadius: 21, backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: sel ? 3 : 0, borderColor: fin.ink,
                    }}
                  >
                    {sel && <MaterialIcons name="check" size={20} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PillButton label="Salvar alterações" onPress={handleSave} fin={fin} loading={saving} disabled={!name.trim()} />
        </ScrollView>
      )}
    </View>
  );
}
