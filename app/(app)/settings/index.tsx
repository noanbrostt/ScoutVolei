import { View, Alert } from 'react-native';
import { Text, Button, List, Switch, useTheme, Divider, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { syncService } from '../../../src/services/syncService';
import { useState } from 'react';

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const { mode, setMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  const isDarkMode = mode === 'dark';

  const toggleTheme = () => {
    setMode(isDarkMode ? 'light' : 'dark');
  };

  const handleLogout = () => {
      logout();
      router.replace('/');
  };

  const handleSync = async () => {
      setSyncing(true);
      try {
        await syncService.syncAll();
        Alert.alert('Sucesso', 'Sincronização concluída!');
      } catch (e) {
        Alert.alert('Erro', 'Falha na sincronização. Verifique a conexão.');
      } finally {
        setSyncing(false);
      }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} className="flex-1">
        
        {/* HEADER */}
        <View className="px-4 pt-4 pb-6">
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Configurações
          </Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Gerencie suas preferências e dados
          </Text>
        </View>

        {/* USER CARD */}
        <View className="px-4 mb-6">
            <Card mode="elevated" style={{ backgroundColor: theme.colors.surface }}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar.Icon size={50} icon="account" style={{ backgroundColor: theme.colors.primaryContainer }} />
                    <View style={{ marginLeft: 16 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {user?.role === 'admin' ? 'Administrador' : (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Visitante')}
                        </Text>
                    </View>
                </Card.Content>
            </Card>
        </View>

        {/* SETTINGS LIST */}
        <View className="px-4">
            <Text variant="titleMedium" style={{ marginBottom: 10, fontWeight: 'bold', opacity: 0.7 }}>Geral</Text>
            
            <Card mode="outlined" style={{ marginBottom: 12, backgroundColor: 'transparent', borderColor: theme.colors.outlineVariant }}>
                <List.Item
                    title="Modo Escuro"
                    description="Alternar entre tema claro e escuro"
                    left={props => <List.Icon {...props} icon="theme-light-dark" />}
                    right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
                />
            </Card>

            <Card mode="outlined" style={{ marginBottom: 12, backgroundColor: 'transparent', borderColor: theme.colors.outlineVariant }}>
                <List.Item
                    title="Aniversariantes do Mês"
                    description="Veja quem faz aniversário por mês"
                    left={props => <List.Icon {...props} icon="cake-variant" />}
                    onPress={() => router.push('/(app)/settings/birthdays')}
                />
            </Card>

            <Card mode="outlined" style={{ marginBottom: 12, backgroundColor: 'transparent', borderColor: theme.colors.outlineVariant }}>
                <List.Item
                    title="Sincronizar Dados"
                    description={syncing ? "Sincronizando..." : "Enviar dados pendentes para a nuvem"}
                    left={props => syncing 
                        ? <ActivityIndicator style={{ marginLeft: 16, marginRight: 16 }} size="small" /> 
                        : <List.Icon {...props} icon="cloud-sync" />
                    }
                    onPress={handleSync}
                    disabled={syncing}
                />
            </Card>
        </View>

                {/* LOGOUT BUTTON */}
                <View className="p-4 pb-2 mt-auto">
                    <Button
                        mode="contained"
                        buttonColor={theme.colors.error}
                        textColor="#FFFFFF"
                        icon="logout"
                        onPress={handleLogout}
                    >
                    Sair
                    </Button>
                </View>
        
                {/* COPYRIGHT NOTICE */}
                <View className="items-center mb-2">
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}>
                        © Noan Caliel Brostt
                    </Text>
                </View>
        
              </SafeAreaView>
            </View>
          );
        }
