// Finance-specific building blocks (Blues). Generic primitives live in src/components/ui.tsx
// and are re-exported here so existing treasury imports keep working.
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { FinTokens } from '../../theme';
import { formatDateBR } from '../ui';

export * from '../ui';

// ── Progress ring (SVG) ─────────────────────────────────────────────────────

export function Ring({ pct, fin, size = 78 }: { pct: number; fin: FinTokens; size?: number }) {
  const stroke = 8;
  const r = (size - (stroke + 1)) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={fin.ringTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={fin.brand} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - safePct / 100)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontWeight: '800', fontSize: 22, color: fin.ink, lineHeight: 24 }}>{safePct}%</Text>
        <Text style={{ fontSize: 9.5, color: fin.sub, fontWeight: '600' }}>do mês</Text>
      </View>
    </View>
  );
}

// ── Compact date stepper ([−] DD/MM/AAAA "data do pgto" [+]) ─────────────────

export function DateStepper({
  date, onStep, fin,
}: { date: Date; onStep: (delta: number) => void; fin: FinTokens }) {
  const Btn = ({ dir }: { dir: number }) => (
    <Pressable
      onPress={() => onStep(dir)}
      hitSlop={8}
      style={{
        width: 30, height: 30, borderRadius: 8,
        borderWidth: 1.5, borderColor: fin.line, backgroundColor: 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <MaterialIcons name={dir < 0 ? 'remove' : 'add'} size={18} color={fin.brand} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Btn dir={-1} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: fin.ink, fontVariant: ['tabular-nums'] }}>
          {formatDateBR(date)}
        </Text>
        <Text style={{ fontSize: 9.5, color: fin.sub, fontWeight: '600' }}>data do pgto</Text>
      </View>
      <Btn dir={1} />
    </View>
  );
}

// ── Segmented tabs (Mensalidades / Eventos) ──────────────────────────────────

export function Tabs<T extends string>({
  value, options, onChange, fin,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; fin: FinTokens }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: fin.chipBg, borderRadius: 11, padding: 3 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8,
              backgroundColor: active ? fin.brand : 'transparent',
              ...(active && fin.shadow !== 'transparent'
                ? { shadowColor: fin.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
                : {}),
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13.5, color: active ? '#fff' : fin.sub }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
