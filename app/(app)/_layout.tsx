import { Tabs, Redirect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useFin } from '../../src/theme';

export default function AppLayout() {
  const fin = useFin();
  const { user } = useAuthStore();
  const canSeeTreasury = user?.role === 'admin' || user?.role === 'financeiro';

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: fin.brand,
        tabBarInactiveTintColor: fin.sub,
        tabBarStyle: {
          backgroundColor: fin.surface,
          borderTopWidth: 1,
          borderTopColor: fin.line,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Times',
          tabBarLabel: 'Times',
          tabBarIcon: ({ color }) => <MaterialIcons name="groups" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Partidas',
          tabBarLabel: 'Partidas',
          tabBarIcon: ({ color }) => <MaterialIcons name="sports-volleyball" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="treasury"
        options={{
          title: 'Financeiro',
          tabBarLabel: 'Financeiro',
          href: canSeeTreasury ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarLabel: 'Configurações',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
