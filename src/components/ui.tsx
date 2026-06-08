// App-wide UI primitives for the "Blues" visual identity.
// Tokens come from useFin(); see src/theme/index.ts.
import { ReactNode, useState, forwardRef } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, ViewStyle, KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { FinTokens } from '../theme';

// ── Formatters ────────────────────────────────────────────────────────────────

const NBSP = ' ';

export const money = (n: number) => {
  const v = Number.isFinite(n) ? n : 0;
  const formatted = Number.isInteger(v)
    ? v.toLocaleString('pt-BR')
    : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$${NBSP}${formatted}`;
};

export const initials = (name: string) =>
  (name?.trim().slice(0, 2) || '?').toUpperCase();

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const formatDateBR = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

// "2026-06-03" → "03/06"
export const isoToShort = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

// "2026-06-03" → "03/06/2026"
export const isoToBR = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Soft card shadow (light theme only — dark uses a 1px border instead).
// Every style key is always present (just toggled between neutral/active values)
// so switching themes updates values in place. Returning different *shapes*
// (border-only vs shadow-only) leaves the removed props un-reset on the native
// view under the new architecture — that's what bugs the border radius / leaves
// stale borders when toggling light/dark.
export const cardShadow = (fin: FinTokens): ViewStyle =>
  fin.shadow === 'transparent'
    ? {
        borderWidth: 1,
        borderColor: fin.line,
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      }
    : {
        borderWidth: 0,
        borderColor: 'transparent',
        shadowColor: '#14213B',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };

// ── Avatar (color + initials) ────────────────────────────────────────────────

export function Avatar({
  name, color, size = 46, fontSize = 16, muted, fin,
}: {
  name: string; color: string; size?: number; fontSize?: number; muted?: boolean; fin: FinTokens;
}) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: muted ? fin.track : color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: muted ? fin.sub : '#fff', fontWeight: '800', fontSize }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ── Square icon button (eye filter / generic) ────────────────────────────────

export function IconBtn({
  icon, active, onPress, fin,
}: { icon: keyof typeof MaterialIcons.glyphMap; active?: boolean; onPress?: () => void; fin: FinTokens }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: active ? fin.brand : fin.eyeBg,
      }}
    >
      <MaterialIcons name={icon} size={20} color={active ? '#fff' : fin.sub} />
    </Pressable>
  );
}

// ── Screen header (pushed screens: back + title + optional actions) ──────────

export function ScreenHeader({
  title, subtitle, onBack, right, fin, backgroundColor, tint,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  fin: FinTokens;
  backgroundColor?: string;
  tint?: string;
}) {
  const color = tint ?? fin.ink;
  const subColor = tint ? tint : fin.sub;
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: backgroundColor ?? 'transparent' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, minHeight: 52 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={color} />
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 19, color, letterSpacing: -0.3 }}>{title}</Text>
          {!!subtitle && (
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: subColor, opacity: tint ? 0.85 : 1, fontWeight: '600' }}>{subtitle}</Text>
          )}
        </View>
        {right}
      </View>
    </SafeAreaView>
  );
}

// ── Pill button ──────────────────────────────────────────────────────────────

type PillVariant = 'primary' | 'outlined' | 'danger';

export function PillButton({
  label, onPress, fin, variant = 'primary', icon, disabled, loading, style,
}: {
  label: string;
  onPress: () => void;
  fin: FinTokens;
  variant?: PillVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  let bg = 'transparent';
  let fg = fin.brand;
  let border: ViewStyle = {};
  if (variant === 'primary') {
    bg = isDisabled ? fin.disabled : fin.brand;
    fg = '#fff';
  } else if (variant === 'outlined') {
    border = { borderWidth: 1.5, borderColor: fin.brand };
    fg = fin.brand;
  } else if (variant === 'danger') {
    border = { borderWidth: 1.5, borderColor: theme.colors.error };
    fg = theme.colors.error;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22,
        backgroundColor: bg, opacity: isDisabled && variant !== 'primary' ? 0.5 : 1,
        ...border,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <MaterialIcons name={icon} size={18} color={fg} />}
          <Text style={{ color: fg, fontWeight: '800', fontSize: 15 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ── Circular progress (0..100) ──────────────────────────────────────────────

export function CircularProgress({
  pct, fin, size = 72, stroke = 7,
}: { pct: number; fin: FinTokens; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={fin.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={fin.brand} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - safe / 100)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontWeight: '800', fontSize: size * 0.26, color: fin.ink, fontVariant: ['tabular-nums'] }}>{Math.round(safe)}%</Text>
      </View>
    </View>
  );
}

// ── Field label (uppercase) ─────────────────────────────────────────────────

export function FieldLabel({ fin, children, hint }: { fin: FinTokens; children: string; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', color: fin.sub }}>{children}</Text>
      {hint && <Text style={{ fontSize: 11.5, color: fin.sub, fontWeight: '500', opacity: 0.8 }}>{hint}</Text>}
    </View>
  );
}

// ── Pill text field ──────────────────────────────────────────────────────────

export const FieldPill = forwardRef<TextInput, {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
  disabled?: boolean;
  multiline?: boolean;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  fin: FinTokens;
  style?: ViewStyle;
}>(function FieldPill({
  value, onChangeText, placeholder, prefix, keyboardType, disabled, multiline, autoFocus,
  secureTextEntry, autoCapitalize, returnKeyType, onSubmitEditing, fin, style,
}, ref) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[{
      flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
      backgroundColor: fin.field, borderWidth: 1.5,
      borderColor: focus ? fin.brand : fin.line, borderRadius: 12,
      paddingHorizontal: 13, height: multiline ? undefined : 48, minHeight: multiline ? 80 : undefined,
      paddingVertical: multiline ? 12 : 0, opacity: disabled ? 0.6 : 1,
    }, style]}>
      {prefix && <Text style={{ fontSize: 15, fontWeight: '700', color: fin.sub }}>{prefix}</Text>}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={fin.sub}
        keyboardType={keyboardType}
        editable={!disabled}
        multiline={multiline}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry && hidden}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ flex: 1, fontSize: 15.5, fontWeight: '600', color: fin.ink, padding: 0, textAlignVertical: multiline ? 'top' : 'center' }}
      />
      {secureTextEntry && (
        <Pressable onPress={() => setHidden(h => !h)} hitSlop={8} style={{ padding: 2 }}>
          <MaterialIcons name={hidden ? 'visibility-off' : 'visibility'} size={20} color={fin.sub} />
        </Pressable>
      )}
    </View>
  );
});
