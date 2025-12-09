import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

export default function MatchReportScreen() {
  const { matchId } = useLocalSearchParams();
  const theme = useTheme();

  return (
    <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineMedium">Relatório da Partida</Text>
      <Text>{matchId}</Text>
      <Text>Em breve...</Text>
    </View>
  );
}
