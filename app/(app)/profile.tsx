import { View, Alert } from 'react-native';
import { Text, Button, List, Switch, useTheme, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { syncService } from '../../src/services/syncService';

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const { mode, setMode } = useThemeStore();

  const isDarkMode = mode === 'dark';

  const toggleTheme = () => {
    setMode(isDarkMode ? 'light' : 'dark');
  };

  const handleSync = async () => {
      try {
        await syncService.uploadPending();
        Alert.alert('Sucesso', 'Sincronização concluída!');
      } catch (e) {
        Alert.alert('Erro', 'Falha na sincronização. Verifique a conexão.');
      }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="p-6 items-center">
        <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Usuário Exemplo</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Técnico</Text>
      </View>

      <List.Section>
        <List.Subheader>Configurações</List.Subheader>
        <List.Item
          title="Modo Escuro"
          left={() => <List.Icon icon="theme-light-dark" />}
          right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
        />
        <Divider />
        <List.Item
          title="Sincronizar Dados"
          description="Enviar dados para a nuvem"
          left={() => <List.Icon icon="cloud-sync" />}
          onPress={handleSync}
        />
      </List.Section>

      <View className="p-4 mt-auto">
        <Button mode="outlined" textColor={theme.colors.error} onPress={() => router.replace('/')}>
          Sair
        </Button>
      </View>
    </View>
  );
}
