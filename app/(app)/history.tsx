import { View } from 'react-native';
import { Text, useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchesHistory() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <View className="px-4 pt-4 pb-2">
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Partidas
          </Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Histórico de jogos e estatísticas
          </Text>
        </View>
      </SafeAreaView>

      <View className="flex-1 items-center justify-center p-8">
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
          Nenhuma partida
        </Text>
        <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
          Inicie um novo scout para registrar estatísticas em tempo real.
        </Text>
      </View>

      <FAB
        icon="plus"
        label="Novo Scout"
        style={{
          position: 'absolute',
          margin: 16,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.primary
        }}
        color="#FFF"
        onPress={() => router.push('/scout/setup')}
      />
    </View>
  );
}
