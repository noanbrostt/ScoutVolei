import { View, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Text, Switch, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { syncService } from '../../../src/services/syncService';
import { useState } from 'react';
import { useFin } from '../../../src/theme';
import { cardShadow, PillButton, CircularProgress } from '../../../src/components/ui';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '';

export default function Profile() {
  const fin = useFin();
  const router = useRouter();
  const { mode, setMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const isDarkMode = mode === 'dark';
  const toggleTheme = () => setMode(isDarkMode ? 'light' : 'dark');

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleSync = async () => {
    setSyncProgress(0);
    setSyncing(true);
    try {
      await syncService.syncAll(f => setSyncProgress(f));
      Alert.alert('Sucesso', 'Sincronização concluída!');
    } catch {
      Alert.alert('Erro', 'Falha na sincronização. Verifique a conexão.');
    } finally {
      setSyncing(false);
    }
  };

  const roleLabel = user?.role === 'admin'
    ? 'Administrador'
    : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Visitante';

  const SettingRow = ({
    icon, title, description, onPress, right, first, disabled,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    description: string;
    onPress?: () => void;
    right?: React.ReactNode;
    first?: boolean;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 14, borderTopWidth: first ? 0 : 1, borderTopColor: fin.line }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: fin.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={icon} size={20} color={fin.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '700', color: fin.ink }}>{title}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: fin.sub, marginTop: 1 }}>{description}</Text>
      </View>
      {right}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 26, color: fin.ink, letterSpacing: -0.4 }}>Configurações</Text>
          <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', marginTop: 2 }}>Gerencie suas preferências e dados</Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* User card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: fin.surface, borderRadius: 16, padding: 16, marginBottom: 22, ...cardShadow(fin) }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: fin.brand, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="person" size={28} color="#fff" />
            </View>
            <Text style={{ fontWeight: '800', fontSize: 18, color: fin.ink, letterSpacing: -0.2 }}>{roleLabel}</Text>
          </View>

          {/* General section */}
          <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub, marginBottom: 10 }}>Geral</Text>
          <View style={{ backgroundColor: fin.surface, borderRadius: 16, overflow: 'hidden', ...cardShadow(fin) }}>
            <SettingRow
              first
              icon="dark-mode"
              title="Modo escuro"
              description="Alternar entre tema claro e escuro"
              right={<Switch value={isDarkMode} onValueChange={toggleTheme} color={fin.brand} />}
            />
            <SettingRow
              icon="cake"
              title="Aniversariantes do mês"
              description="Veja quem faz aniversário por mês"
              onPress={() => router.push('/(app)/settings/birthdays')}
              right={<MaterialIcons name="chevron-right" size={24} color={fin.sub} />}
            />
            <SettingRow
              icon="cloud-sync"
              title="Sincronizar dados"
              description={syncing ? 'Sincronizando...' : 'Enviar dados pendentes para a nuvem'}
              onPress={handleSync}
              disabled={syncing}
              right={syncing ? <ActivityIndicator size="small" color={fin.brand} /> : <MaterialIcons name="chevron-right" size={24} color={fin.sub} />}
            />
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />

          {/* Logout */}
          <PillButton label="Sair" icon="logout" variant="danger" fin={fin} onPress={handleLogout} />

          <Text style={{ textAlign: 'center', fontSize: 11.5, fontWeight: '600', color: fin.sub, opacity: 0.7, marginTop: 16 }}>
            © Noan Caliel Brostt{APP_VERSION ? `  ·  v${APP_VERSION}` : ''}
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* Blocking overlay during sync — renders above the tab bar via Portal */}
      <Portal>
        {syncing && (
          <Pressable
            onPress={() => {}}
            android_disableSound
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ backgroundColor: fin.surface, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 36, alignItems: 'center', gap: 14 }}>
              <CircularProgress pct={syncProgress * 100} fin={fin} />
              <Text style={{ fontWeight: '700', fontSize: 14, color: fin.ink }}>Sincronizando...</Text>
            </View>
          </Pressable>
        )}
      </Portal>
    </View>
  );
}
