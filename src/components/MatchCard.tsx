import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useFin } from '../theme';
import { cardShadow } from './ui';

export function MatchCard({
  match, isAdmin, onPress, onDelete,
}: {
  match: any;
  isAdmin?: boolean;
  onPress: () => void;
  onDelete?: (id: string) => void;
}) {
  const fin = useFin();
  const theme = useTheme();

  const date = new Date(match.date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const resultColor = match.setsUs > match.setsThem ? fin.good
    : match.setsUs === match.setsThem ? fin.warn
    : theme.colors.error;
  const statusColor = match.isFinished ? fin.good : fin.warn;

  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: fin.surface, borderRadius: 14, padding: 14, paddingLeft: 17, marginBottom: 10, overflow: 'hidden', ...cardShadow(fin) }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: resultColor }} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, color: fin.sub, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{date}</Text>
            {match.hasPendingData && <MaterialIcons name="cloud-upload" size={15} color={fin.warn} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: match.teamColor || fin.brand, letterSpacing: -0.2 }}>{match.teamName}</Text>
            <Text style={{ marginHorizontal: 6, fontSize: 14, color: fin.sub, fontWeight: '600' }}>vs</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: fin.ink, letterSpacing: -0.2 }}>{match.opponentName}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: fin.sub, fontWeight: '600', marginTop: 2 }}>{match.location || 'Sem local'}</Text>
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: statusColor, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={match.isFinished ? 'check' : 'schedule'} size={16} color={statusColor} />
          </View>
          {isAdmin && onDelete && (
            <Pressable onPress={() => onDelete(match.id)} hitSlop={6} style={{ padding: 2 }}>
              <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sets */}
      <View style={{ marginTop: 10, backgroundColor: fin.field, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: fin.sub }}>SETS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: fin.ink, fontVariant: ['tabular-nums'] }}>{match.setsUs}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: fin.sub }}>X</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: fin.ink, fontVariant: ['tabular-nums'] }}>{match.setsThem}</Text>
        </View>
      </View>
    </Pressable>
  );
}
