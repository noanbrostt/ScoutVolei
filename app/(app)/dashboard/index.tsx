import { View } from 'react-native';
import { Text, Button, Card, useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1 p-4" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineMedium" style={{ color: theme.colors.primary, marginBottom: 20, fontWeight: 'bold' }}>
        Painel
      </Text>

      <Card style={{ marginBottom: 16 }}>
        <Card.Title title="Ação Rápida" left={(props) => <FAB icon="lightning-bolt" {...props} size="small" />} />
        <Card.Content>
          <Text variant="bodyMedium">Inicie uma nova partida agora mesmo.</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained-tonal" onPress={() => router.push('/scout/setup')}>Novo Scout</Button>
        </Card.Actions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Card.Title title="Meus Times" />
        <Card.Content>
          <Text variant="bodyMedium">Gerencie seus times e atletas.</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => router.push('/(app)/teams')}>Ver Times</Button>
        </Card.Actions>
      </Card>
    </View>
  );
}
