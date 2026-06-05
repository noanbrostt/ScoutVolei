import { View, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { cardShadow, FieldLabel, FieldPill } from '../../../src/components/treasury/finance-ui';

type TeamConfig = { valorBase: string };

export default function FeeConfig() {
  const fin = useFin();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [configs, setConfigs] = useState<Record<string, TeamConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const allTeams = await teamService.getAll();
      setTeams(allTeams);
      const map: Record<string, TeamConfig> = {};
      for (const team of allTeams) {
        const c = await treasuryService.getFeeConfig(team.id);
        map[team.id] = { valorBase: c ? String(c.valorBase) : '' };
      }
      setConfigs(map);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const team of teams) {
        const c = configs[team.id];
        if (!c) continue;
        const base = parseFloat(c.valorBase.replace(',', '.'));
        if (!isNaN(base) && base >= 0) {
          await treasuryService.saveFeeConfig(team.id, base, 0);
        }
      }
      syncService.triggerSync();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={fin.ink} />
          </Pressable>
          <Text style={{ fontWeight: '800', fontSize: 19, color: fin.ink, letterSpacing: -0.3 }}>Valor da mensalidade</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', marginBottom: 16 }}>
          Configure o valor base da mensalidade por time. Normalmente alterado 1× ao ano.
        </Text>

        {teams.map(team => (
          <View
            key={team.id}
            style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 14, marginBottom: 12, ...cardShadow(fin) }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: team.color }} />
              <Text style={{ fontWeight: '800', fontSize: 16, color: fin.ink, letterSpacing: -0.2 }}>{team.name}</Text>
            </View>
            <FieldLabel fin={fin}>Mensalidade</FieldLabel>
            <FieldPill
              fin={fin}
              value={configs[team.id]?.valorBase ?? ''}
              onChangeText={val => setConfigs(prev => ({ ...prev, [team.id]: { ...prev[team.id], valorBase: val } }))}
              prefix="R$"
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: 12, backgroundColor: fin.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: saving ? 0.6 : 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{saving ? '...' : 'Salvar'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
