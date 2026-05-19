import { View, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Appbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { teamService } from '../../../src/services/teamService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';

type TeamConfig = { valorBase: string };

export default function FeeConfig() {
  const theme = useTheme();
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <Appbar.Header statusBarHeight={0} style={{ backgroundColor: 'transparent', elevation: 0 }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Valor da Mensalidade" />
        </Appbar.Header>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 20 }}>
          Configure o valor base da mensalidade por time. Alterado normalmente 1x ao ano.
        </Text>

        {teams.map((team, index) => (
          <View key={team.id}>
            {index > 0 && <Divider style={{ marginVertical: 16 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 12, height: 12, borderRadius: 6,
                backgroundColor: team.color,
                marginRight: 8,
              }} />
              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{team.name}</Text>
            </View>
            <TextInput
              label="Mensalidade (R$)"
              value={configs[team.id]?.valorBase ?? ''}
              onChangeText={val =>
                setConfigs(prev => ({ ...prev, [team.id]: { ...prev[team.id], valorBase: val } }))
              }
              mode="outlined"
              keyboardType="decimal-pad"
              placeholder="Ex: 40,00"
            />
          </View>
        ))}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={{ marginTop: 28 }}
        >
          Salvar
        </Button>
      </ScrollView>
    </View>
  );
}
