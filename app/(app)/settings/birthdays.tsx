import { View, FlatList, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { playerService } from '../../../src/services/playerService';
import { useFin } from '../../../src/theme';
import { ScreenHeader, cardShadow } from '../../../src/components/ui';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function BirthdaysScreen() {
  const router = useRouter();
  const fin = useFin();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const monthsListRef = useRef<FlatList>(null);

  useEffect(() => { loadBirthdays(); }, [selectedMonth]);

  useEffect(() => {
    setTimeout(() => {
      try {
        monthsListRef.current?.scrollToIndex({ index: selectedMonth - 1, animated: true, viewPosition: 0.5 });
      } catch {}
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
    <View style={{ flex: 1, backgroundColor: fin.bg }}>
      <ScreenHeader title="Aniversariantes" onBack={() => router.back()} fin={fin} />

      {/* Month selector */}
      <View>
        <FlatList
          ref={monthsListRef}
          data={MONTHS}
          extraData={`${selectedMonth}|${fin.bg}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          keyExtractor={item => item}
          onScrollToIndexFailed={info => {
            new Promise(resolve => setTimeout(resolve, 500)).then(() => {
              monthsListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            });
          }}
          renderItem={({ item, index }) => {
            const monthNum = index + 1;
            const sel = selectedMonth === monthNum;
            return (
              <Pressable
                onPress={() => setSelectedMonth(monthNum)}
                style={{ borderWidth: 1.5, borderColor: sel ? fin.brand : fin.line, backgroundColor: sel ? fin.brand : 'transparent', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13.5, color: sel ? '#fff' : fin.sub }}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={birthdays}
        extraData={fin}
        keyExtractor={item => item.player.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 40 }}
        ListEmptyComponent={!loading ? (
          <View style={{ alignItems: 'center', marginTop: 50, gap: 14 }}>
            <MaterialIcons name="cake" size={56} color={fin.sub} style={{ opacity: 0.5 }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: fin.sub, textAlign: 'center' }}>
              Nenhum aniversariante em {MONTHS[selectedMonth - 1]}
            </Text>
          </View>
        ) : null}
        renderItem={({ item }) => {
          const teamColor = item.teamColor || fin.brand;
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: fin.surface, borderRadius: 14, padding: 12, marginBottom: 10, ...cardShadow(fin) }}>
              <View style={{ width: 52, height: 52, borderRadius: 13, backgroundColor: teamColor + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 20, color: teamColor, lineHeight: 22, fontVariant: ['tabular-nums'] }}>
                  {getDayFromDate(item.player.birthday)}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: teamColor, opacity: 0.8, textTransform: 'uppercase' }}>
                  {MONTHS[selectedMonth - 1].substring(0, 3)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: fin.ink, letterSpacing: -0.2 }}>
                  {item.player.surname || item.player.name.split(' ')[0]}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: teamColor, marginTop: 1 }}>
                  {item.teamName || 'Sem time'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
