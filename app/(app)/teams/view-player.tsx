import { View, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, Card, Divider, Avatar, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { playerService } from '../../../src/services/playerService';
import { useAuthStore } from '../../../src/store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ViewPlayer() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams();
  const theme = useTheme();
  const user = useAuthStore(s => s.user); // Get user
  
  const [player, setPlayer] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const loadPlayer = async () => {
        if (typeof playerId === 'string') {
          const p = await playerService.getById(playerId);
          setPlayer(p);
        }
      };
      loadPlayer();
    }, [playerId])
  );

  if (!player) return <View className="flex-1 bg-white" />;

  const InfoRow = ({ label, value }: { label: string, value: string | number | null | undefined }) => (
    <View style={{ marginBottom: 16 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.outline }}>{label}</Text>
        <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{value != null ? String(value) : '-'}</Text>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Detalhes do Atleta" />
        {user?.role === 'admin' && (
            <Appbar.Action icon="pencil" onPress={() => router.push({ pathname: '/(app)/teams/edit-player', params: { playerId } })} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Header Card */}
        <Card mode="elevated" style={{ marginBottom: 20, backgroundColor: theme.colors.surface }}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Avatar.Text 
                    size={80} 
                    label={player.name.substring(0,2).toUpperCase()} 
                    style={{ backgroundColor: theme.colors.primaryContainer, marginBottom: 16 }}
                    color={theme.colors.onPrimaryContainer}
                />
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                    {player.name}
                </Text>
                <Text variant="titleMedium" style={{ opacity: 0.7 }}>
                    {player.surname ? `"${player.surname}"` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <Chip 
                        mode="outlined" 
                        textStyle={{ color: theme.colors.primary, fontSize: 14, fontWeight: 'bold' }}
                        style={{ backgroundColor: 'transparent', borderColor: theme.colors.outline }}
                    >
                        {player.position}
                    </Chip>
                    {player.number && (
                        <Chip 
                            mode="outlined" 
                            textStyle={{ fontSize: 14, fontWeight: 'bold' }}
                            style={{ backgroundColor: 'transparent', borderColor: theme.colors.outline }}
                        >
                            #{player.number}
                        </Chip>
                    )}
                </View>
            </Card.Content>
        </Card>

        {/* Details */}
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16, marginTop: 8 }}>Informações Pessoais</Text>
        
        <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
                <InfoRow label="RG" value={player.rg} />
            </View>
            <View style={{ flex: 1 }}>
                <InfoRow label="CPF" value={player.cpf} />
            </View>
        </View>

        <InfoRow label="Data de Nascimento" value={player.birthday} />

        <Divider style={{ marginVertical: 16 }} />

        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Dados Médicos</Text>
        <InfoRow label="Alergias / Observações" value={player.allergies} />

      </ScrollView>
    </View>
  );
}
