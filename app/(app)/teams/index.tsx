import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { teamService } from '../../../src/services/teamService';
import { useAuthStore } from '../../../src/store/authStore';
import { syncService } from '../../../src/services/syncService';
import { useFin } from '../../../src/theme';
import { cardShadow, Avatar } from '../../../src/components/ui';

export default function TeamsList() {
  const fin = useFin();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTeams(); }, []));

  useEffect(() => {
    const unsubscribe = syncService.subscribe(() => { loadTeams(); });
    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 26, color: fin.ink, letterSpacing: -0.4 }}>Meus times</Text>
          <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', marginTop: 2 }}>Gerencie seus times e atletas</Text>
        </View>
      </SafeAreaView>

      {teams.length === 0 && !loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontWeight: '800', fontSize: 20, color: fin.ink, textAlign: 'center' }}>Nenhum time ainda</Text>
          <Text style={{ fontSize: 14, color: fin.sub, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
            Cadastre seu primeiro time para começar a registrar scouts e estatísticas.
          </Text>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/(app)/teams/new')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: fin.brand, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16 }}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Criar novo time</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTeams} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/teams/${item.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fin.surface, borderRadius: 14, padding: 14, marginBottom: 10, ...cardShadow(fin) }}
            >
              <Avatar name={item.name} color={item.color ?? fin.brand} size={44} fin={fin} />
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 18, color: fin.ink, letterSpacing: -0.2 }}>{item.name}</Text>
                {item.hasPendingData && <MaterialIcons name="cloud-upload" size={18} color={fin.warn} />}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={fin.sub} />
            </Pressable>
          )}
        />
      )}

      {teams.length > 0 && isAdmin && (
        <Pressable
          onPress={() => router.push('/(app)/teams/new')}
          style={{
            position: 'absolute', right: 18, bottom: 18,
            flexDirection: 'row', alignItems: 'center', gap: 7,
            backgroundColor: fin.brand, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16,
            ...(fin.shadow === 'transparent' ? {} : { shadowColor: fin.brand, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }),
          }}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Novo time</Text>
        </Pressable>
      )}
    </View>
  );
}
