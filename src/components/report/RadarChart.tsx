import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { Text, Portal, Dialog, Button, IconButton, useTheme, Surface } from 'react-native-paper';

const actions = [
  'Passe',
  'Defesa',
  'Bloqueio',
  'Ataque',
  'Saque',
  'Levantamento',
];
const radius = 80;
const size = radius * 2 + 50;
const center = size / 2;
const levels = 4;

type Props = {
  data: { [key: string]: number }; // valores entre 0 e 1 (eficiência)
};

export default function RadarChart({ data }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const angleSlice = (2 * Math.PI) / actions.length;

  const scaleValue = (val: number) => val * radius;

  const getPoint = (angle: number, value: number) => {
    const scaled = scaleValue(value);
    const x = center + scaled * Math.sin(angle);
    const y = center - scaled * Math.cos(angle);
    return `${x},${y}`;
  };

  const getAxisPoint = (angle: number, dist: number) => {
    const x = center + dist * Math.sin(angle);
    const y = center - dist * Math.cos(angle);
    return { x, y };
  };

  const polygonPoints = actions
    .map((action, i) => {
      const angle = i * angleSlice;
      const value = data[action] ?? 0;
      return getPoint(angle, value);
    })
    .join(' ');

  return (
    <Surface style={[styles.cardContainer, { backgroundColor: theme.colors.surface, elevation: 2 }]} mode="elevated">
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Positividade</Text>
        <IconButton 
            icon="help-circle-outline" 
            size={20} 
            onPress={() => setVisible(true)}
            style={{ margin: 0 }}
            iconColor={theme.colors.onSurfaceVariant} 
        />
      </View>

      <Svg width={size} height={size}>
        {/* Camadas da teia */}
        {[...Array(levels + 1)].map((_, level) => {
          const r = (radius / levels) * level;
          const points = actions
            .map((_, i) => {
              const angle = i * angleSlice;
              const { x, y } = getAxisPoint(angle, r);
              return `${x},${y}`;
            })
            .join(' ');

          const legendValue = level * 25;
          return (
            <React.Fragment key={level}>
              <Polygon points={points} stroke={theme.colors.outlineVariant} fill="none" />
              {level > 0 && (
                <SvgText
                  x={center}
                  y={center - r}
                  fontSize="8"
                  fill={theme.colors.onSurfaceDisabled}
                  textAnchor="middle"
                >
                  {legendValue}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Linhas dos eixos */}
        {actions.map((_, i) => {
          const angle = i * angleSlice;
          const { x, y } = getAxisPoint(angle, radius);
          return (
            <Line
              key={`line-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={theme.colors.outlineVariant}
            />
          );
        })}

        {/* Área preenchida */}
        <Polygon
          points={polygonPoints}
          fill={theme.dark ? "rgba(0, 200, 83, 0.2)" : "rgba(0,200,83,0.4)"}
          stroke={theme.colors.primary}
          strokeWidth={2}
        />

        {/* Pontos nos vértices */}
        {actions.map((action, i) => {
          const angle = i * angleSlice;
          const value = data[action] ?? 0;
          const [x, y] = getPoint(angle, value).split(',').map(Number);
          return <Circle key={`dot-${i}`} cx={x} cy={y} r={3} fill={theme.colors.primary} />;
        })}

        {/* Rótulos das ações */}
        {actions.map((action, i) => {
          const angle = i * angleSlice;
          const { x, y } = getAxisPoint(angle, radius + 12);
          const isGray = data[action] === 0.04141;
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fill={isGray ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
              opacity={isGray ? 0.4 : 1}
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
            >
              {action === 'Levantamento' ? 'Levant.' : action}
            </SvgText>
          );
        })}
      </Svg>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Positividade</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>Cálculo:</Text> (Ações Nota 3 + Ações Nota 2) ÷ Total de Ações.
            </Text>
            <Text variant="bodyMedium">
              <Text style={{ fontWeight: 'bold' }}>Nota:</Text> Se o fundamento estiver cinza, significa que não houve registros desse tipo.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Entendi</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
