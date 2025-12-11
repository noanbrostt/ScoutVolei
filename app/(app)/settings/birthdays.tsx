import { View, FlatList, ScrollView } from 'react-native';
import { Text, Appbar, Chip, Avatar, Card, useTheme, Surface, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { playerService } from '../../../src/services/playerService';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function BirthdaysScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Default to current month (1-12)
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const monthsListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadBirthdays();
  }, [selectedMonth]);

  // Scroll to selected month on initial mount
  useEffect(() => {
      // Small timeout to ensure layout is ready
      setTimeout(() => {
          try {
            monthsListRef.current?.scrollToIndex({ 
                index: selectedMonth - 1, 
                animated: true, 
                viewPosition: 0.5 // Center the item
            });
          } catch (e) {
              // Ignore scroll errors if layout not ready
          }
      }, 500);
  }, []);

  const loadBirthdays = async () => {
    setLoading(true);
    try {
        const data = await playerService.getBirthdaysByMonth(selectedMonth);
        setBirthdays(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const getDayFromDate = (dateStr: string) => {
      if (!dateStr) return '';
      if (dateStr.includes('/')) return dateStr.split('/')[0];
      if (dateStr.includes('-')) return dateStr.split('-')[2];
      return '';
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Aniversariantes" />
      </Appbar.Header>

      <View>
        <FlatList
            ref={monthsListRef}
            data={MONTHS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingRight: 32 }}
            keyExtractor={(item) => item}
            onScrollToIndexFailed={(info) => {
                const wait = new Promise(resolve => setTimeout(resolve, 500));
                wait.then(() => {
                    monthsListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                });
            }}
            renderItem={({ item, index }) => {
                const monthNum = index + 1;
                const isSelected = selectedMonth === monthNum;
                return (
                    <Chip
                        selected={isSelected}
                        showSelectedOverlay
                        onPress={() => setSelectedMonth(monthNum)}
                        style={{ marginRight: 8, backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface }}
                        textStyle={{ fontWeight: isSelected ? 'bold' : 'normal' }}
                    >
                        {item}
                    </Chip>
                );
            }}
        />
      </View>

      <FlatList
        data={birthdays}
        keyExtractor={(item) => item.player.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
            !loading ? (
                <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                    <Avatar.Icon size={64} icon="cake-variant-outline" style={{ backgroundColor: 'transparent' }} color={theme.colors.onSurface} />
                    <Text variant="bodyLarge" style={{ marginTop: 16 }}>Nenhum aniversariante em {MONTHS[selectedMonth-1]}</Text>
                </View>
            ) : null
        }
        renderItem={({ item }) => (
            <Surface 
                style={{ 
                    marginBottom: 12, 
                    borderRadius: 12, 
                    backgroundColor: theme.colors.surface,
                    elevation: 1
                }}
            >
                <View style={{ flexDirection: 'row', padding: 16, alignItems: 'center' }}>
                    <View style={{ 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 50, 
                        height: 50, 
                        borderRadius: 25, 
                        backgroundColor: theme.colors.secondaryContainer,
                        marginRight: 16
                    }}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSecondaryContainer }}>
                            {getDayFromDate(item.player.birthday)}
                        </Text>
                        <Text variant="labelSmall" style={{ marginTop: -2, opacity: 0.7 }}>
                           {MONTHS[selectedMonth-1].substring(0,3)}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {item.player.name}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                            {item.teamName || 'Sem Time'}
                        </Text>
                    </View>
                </View>
            </Surface>
        )}
      />
    </View>
  );
}
