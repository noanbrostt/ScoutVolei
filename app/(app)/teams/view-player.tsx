import { View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { playerService } from '../../../src/services/playerService';
import { syncService } from '../../../src/services/syncService';
import { useAuthStore } from '../../../src/store/authStore';
import { useFin } from '../../../src/theme';
import { ScreenHeader, IconBtn, Avatar, cardShadow } from '../../../src/components/ui';

const calculateAge = (dateString?: string) => {
  if (!dateString) return null;
  let birthDate: Date;
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/');
    birthDate = new Date(`${y}-${m}-${d}`);
  } else {
    birthDate = new Date(dateString);
  }
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const mo = today.getMonth() - birthDate.getMonth();
  if (mo < 0 || (mo === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export default function ViewPlayer() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams();
  const fin = useFin();
  const user = useAuthStore(s => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'financeiro';

  const [player, setPlayer] = useState<any>(null);

  const loadPlayer = async () => {
    if (typeof playerId === 'string') {
      const p = await playerService.getById(playerId);
      setPlayer(p);
    }
  };

  useFocusEffect(useCallback(() => { loadPlayer(); }, [playerId]));

  useEffect(() => {
    const unsubscribe = syncService.subscribe(() => { loadPlayer(); });
    return () => unsubscribe();
  }, [playerId]);

  if (!player) return <View style={{ flex: 1, backgroundColor: fin.bg }} />;

  const age = calculateAge(player.birthday);

  const DataField = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub }}>{label}</Text>
      <Text style={{ fontSize: 15.5, fontWeight: '700', color: fin.ink, marginTop: 3 }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader
        title="Perfil do atleta"
        onBack={() => router.back()}
        fin={fin}
        right={canEdit ? <IconBtn icon="edit" fin={fin} onPress={() => router.push({ pathname: '/(app)/teams/edit-player', params: { playerId } })} /> : undefined}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 24 }}>
          <View>
            <Avatar name={player.name} color={fin.brand} size={110} fontSize={40} fin={fin} />
            {player.syncStatus === 'pending' && (
              <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: fin.surface, borderRadius: 16, padding: 4, ...cardShadow(fin) }}>
                <MaterialIcons name="cloud-upload" size={22} color={fin.warn} />
              </View>
            )}
          </View>

          <Text style={{ fontWeight: '800', fontSize: 24, color: fin.ink, marginTop: 16, textAlign: 'center', letterSpacing: -0.3 }}>{player.name}</Text>
          {!!player.surname && <Text style={{ fontSize: 15, color: fin.sub, fontWeight: '600', marginTop: 2 }}>"{player.surname}"</Text>}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ backgroundColor: fin.brand, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{player.position?.toUpperCase()}</Text>
            </View>
            {!!player.number && (
              <View style={{ borderWidth: 1.5, borderColor: fin.line, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 }}>
                <Text style={{ color: fin.ink, fontWeight: '800', fontSize: 13 }}>#{player.number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal data */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub, marginBottom: 10 }}>Dados pessoais</Text>
          <View style={{ backgroundColor: fin.surface, borderRadius: 16, padding: 16, ...cardShadow(fin) }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <DataField label="Nascimento" value={player.birthday || '—'} />
              <DataField label="Idade" value={age !== null ? `${age} anos` : '—'} />
            </View>
            <View style={{ height: 1, backgroundColor: fin.line, marginVertical: 14 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <DataField label="RG" value={player.rg || '—'} />
              <DataField label="CPF" value={player.cpf || '—'} />
            </View>
          </View>
        </View>

        {/* Medical */}
        {!!player.allergies && (
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub, marginBottom: 10 }}>Observações médicas</Text>
            <View style={{ backgroundColor: fin.warnSoft, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: fin.warn }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MaterialIcons name="error-outline" size={18} color={fin.warn} />
                <Text style={{ color: fin.warn, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.3 }}>AVISO</Text>
              </View>
              <Text style={{ color: fin.ink, fontSize: 14, fontWeight: '600', lineHeight: 20 }}>{player.allergies}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
