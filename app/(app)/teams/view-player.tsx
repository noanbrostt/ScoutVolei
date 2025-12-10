import { View, ScrollView } from 'react-native';
import { Text, Appbar, useTheme, Card, Divider, Avatar, Chip, Surface, Icon } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { playerService } from '../../../src/services/playerService';
import { syncService } from '../../../src/services/syncService';
import { useAuthStore } from '../../../src/store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ViewPlayer() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams();
  const theme = useTheme();
  const user = useAuthStore(s => s.user); // Get user
  
  const [player, setPlayer] = useState<any>(null);

  const loadPlayer = async () => {
    if (typeof playerId === 'string') {
      const p = await playerService.getById(playerId);
      setPlayer(p);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlayer();
    }, [playerId])
  );

  useEffect(() => {
    const unsubscribe = syncService.subscribe(() => {
      loadPlayer();
    });
    return () => unsubscribe();
  }, [playerId]);

  if (!player) return <View className="flex-1" style={{ backgroundColor: theme.colors.background }} />;

  const calculateAge = (dateString?: string) => {
    if (!dateString) return null;
    // Tries to handle DD/MM/YYYY or YYYY-MM-DD
    let birthDate;
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        // Assuming PT-BR format DD/MM/YYYY
        birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
        birthDate = new Date(dateString);
    }
    
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const age = calculateAge(player.birthday);

  const StatBox = ({ icon, label, value, subLabel }: { icon: string, label: string, value: string | number, subLabel?: string }) => (
    <Surface 
        style={{ 
            flex: 1, 
            padding: 12, 
            borderRadius: 12, 
            backgroundColor: theme.colors.surface, // Use surface color for card
            alignItems: 'center',
            marginHorizontal: 4,
            elevation: 2
        }}
    >
        <Icon source={icon} size={24} color={theme.colors.primary} />
        <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 8, color: theme.colors.onSurface }}>
            {value}
            {subLabel && <Text variant="bodySmall" style={{ fontSize: 12 }}> {subLabel}</Text>}
        </Text>
        <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Surface>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated={false}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Perfil do Atleta" style={{ alignItems: 'center' }} />
        {/* Empty view to balance the header if needed, or action button */}
        {user?.role === 'admin' ? (
            <Appbar.Action icon="pencil" onPress={() => router.push({ pathname: '/(app)/teams/edit-player', params: { playerId } })} />
        ) : <View style={{ width: 48 }} />}
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Hero Section */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 24 }}>
            <View style={{ position: 'relative' }}>
                <Avatar.Text 
                    size={110} 
                    label={player.name.substring(0,2).toUpperCase()} 
                    style={{ backgroundColor: theme.colors.primary }}
                    color="#FFF"
                    labelStyle={{ fontSize: 40, fontWeight: 'bold' }}
                />
                {player.syncStatus === 'pending' && (
                    <View style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0, 
                        backgroundColor: theme.colors.surface, 
                        borderRadius: 20, 
                        padding: 4,
                        elevation: 4 
                    }}>
                        <Icon source="cloud-upload" size={24} color="#F9A825" />
                    </View>
                )}
            </View>

            <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
                {player.name}
            </Text>
            {player.surname && (
                <Text variant="titleMedium" style={{ opacity: 0.6, marginTop: -4 }}>
                    "{player.surname}"
                </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <Chip 
                    mode="flat" 
                    textStyle={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}
                    style={{ backgroundColor: theme.colors.primary, height: 32 }}
                >
                    {player.position.toUpperCase()}
                </Chip>
                {player.number && (
                    <Chip 
                        mode="outlined" 
                        textStyle={{ fontWeight: 'bold' }}
                        style={{ borderColor: theme.colors.outline, height: 32 }}
                    >
                        #{player.number}
                    </Chip>
                )}
            </View>
        </View>

        {/* Personal Info Section */}
        <View style={{ paddingHorizontal: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, opacity: 0.8 }}>
                Dados Pessoais
            </Text>
            <Surface style={{ borderRadius: 12, backgroundColor: theme.colors.surfaceVariant, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text variant="labelMedium" style={{ opacity: 0.6 }}>Data de Nascimento</Text>
                        <Text variant="bodyLarge">{player.birthday || '-'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text variant="labelMedium" style={{ opacity: 0.6 }}>Idade</Text>
                        <Text variant="bodyLarge">
                            {age !== null ? `${age} anos` : '-'}
                        </Text>
                    </View>
                </View>
                <Divider style={{ backgroundColor: theme.colors.outline, opacity: 0.2, marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        <Text variant="labelMedium" style={{ opacity: 0.6 }}>RG</Text>
                        <Text variant="bodyLarge">{player.rg || '-'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text variant="labelMedium" style={{ opacity: 0.6 }}>CPF</Text>
                        <Text variant="bodyLarge">{player.cpf || '-'}</Text>
                    </View>
                </View>
            </Surface>
        </View>

        {/* Medical Section (Only if content exists) */}
        {player.allergies && (
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, opacity: 0.8 }}>
                    Observações Médicas
                </Text>
                <Surface style={{ 
                    borderRadius: 12, 
                    backgroundColor: theme.colors.tertiaryContainer, // Changed to a warning-like or tertiary tone
                    padding: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: theme.colors.tertiary 
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Icon source="alert-circle" size={20} color={theme.colors.tertiary} />
                        <Text variant="titleSmall" style={{ color: theme.colors.tertiary, fontWeight: 'bold', marginLeft: 8 }}>
                            AVISO
                        </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
                        {player.allergies}
                    </Text>
                </Surface>
            </View>
        )}

      </ScrollView>
    </View>
  );
}
