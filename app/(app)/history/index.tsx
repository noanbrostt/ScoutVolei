import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function History() {
  const theme = useTheme();

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>Histórico de Partidas</Text>
      <Text variant="bodyMedium">Nenhuma partida registrada ainda.</Text>
    </View>
  );
}
