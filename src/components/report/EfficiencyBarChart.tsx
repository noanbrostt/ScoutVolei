import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { Text, Portal, Dialog, Button, IconButton, useTheme, Surface } from 'react-native-paper';

type Props = {
  data: {
    [key: string]: {
      0: number;
      1: number;
      2: number;
      3: number;
    };
  };
  barColors?: {
    positive: string;
    negative: string;
    neutral: string;
    empty?: string;
  };
};

export default function EfficiencyBarChart({ data, barColors }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const width = 300;
  const height = 220;
  const barWidth = 25;
  const barSpacing = 20;
  const centerY = height / 2 - 10;
  const labelPaddingOutside = 3;
  const smallBarThreshold = 15;

  const {
    positive = '#4CAF50',
    negative = '#F44336',
    neutral = '#BDBDBD',
    empty = theme.dark ? '#444' : '#ddd',
  } = barColors || {};

  const keys = Object.keys(data);

  const calcEfficiency = (item: { 0: number; 1: number; 2: number; 3: number }) => {
    const total = item[0] + item[1] + item[2] + item[3];
    if (total === 0) return null;
    return (item[3] + item[2] - (item[1] + item[0])) / total;
  };

  const formatPercentage = (value: number | null): string | null => {
    if (value === null) return null;
    return (value * 100).toFixed(1) + '%';
  };

  const getTextFillColor = (barColor: string, isInside: boolean): string => {
    if (!isInside) return theme.colors.onSurface;
    if (barColor === positive || barColor === negative) return '#FFF';
    return '#000';
  };

  return (
    <Surface style={[styles.cardContainer, { backgroundColor: theme.colors.surface, elevation: 2 }]} mode="elevated">
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Eficiência</Text>
        <IconButton 
            icon="help-circle-outline" 
            size={20} 
            onPress={() => setVisible(true)}
            style={{ margin: 0 }}
            iconColor={theme.colors.onSurfaceVariant} 
        />
      </View>

      <Svg width={width} height={height} style={{ paddingTop: 10 }}>
        {/* Central Line */}
        <Line
          x1="0"
          x2={width}
          y1={centerY}
          y2={centerY}
          stroke={theme.colors.outlineVariant}
          strokeWidth="1"
        />

        {/* Background Grid Lines */}
        {[0.25, 0.5, 0.75, 1].map((v, i) => (
          <React.Fragment key={i}>
            <Line
              x1="0"
              x2={width}
              y1={centerY - v * centerY}
              y2={centerY - v * centerY}
              stroke={theme.colors.outlineVariant}
              strokeDasharray="4"
            />
            <Line
              x1="0"
              x2={width}
              y1={centerY + v * centerY}
              y2={centerY + v * centerY}
              stroke={theme.colors.outlineVariant}
              strokeDasharray="4"
            />
            <SvgText x={4} y={centerY - v * centerY + 6} fontSize="8" fill={theme.colors.onSurfaceDisabled}>{`${v * 100}%`}</SvgText>
            <SvgText x={4} y={centerY + v * centerY + 6} fontSize="8" fill={theme.colors.onSurfaceDisabled}>{`${-v * 100}%`}</SvgText>
          </React.Fragment>
        ))}

        {/* Bars */}
        {keys.map((key, i) => {
          const item = data[key];
          const efficiency = calcEfficiency(item);
          const formattedEfficiency = formatPercentage(efficiency);
          const total = item[0] + item[1] + item[2] + item[3];
          const barHeightAbs = efficiency !== null ? Math.abs(efficiency) * centerY : 0;
          const x = i * (barWidth + barSpacing) + 40;
          const yBar = efficiency !== null && efficiency >= 0 ? centerY - barHeightAbs : centerY;
          const isPositive = efficiency !== null && efficiency >= 0;
          const isSmallBar = barHeightAbs < smallBarThreshold;

          const color = total === 0 ? empty : (efficiency! > 0 ? positive : (efficiency! < 0 ? negative : neutral));

          let textY, isInside;

          if (formattedEfficiency !== null) {
            if (isSmallBar) {
              textY = isPositive ? yBar - labelPaddingOutside : yBar + barHeightAbs + labelPaddingOutside + 8;
              isInside = false;
            } else {
              textY = yBar + barHeightAbs / 2 + 3;
              isInside = true;
            }
          }

          return (
            <React.Fragment key={key}>
              <Rect
                x={x}
                y={yBar}
                width={barWidth}
                height={barHeightAbs}
                fill={color}
              />
              {formattedEfficiency !== null && (
                <SvgText
                  x={x + barWidth / 2}
                  y={textY}
                  fontSize="9"
                  fill={getTextFillColor(color, isInside || false)}
                  textAnchor="middle"
                >
                  {formattedEfficiency}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                fontSize="9"
                fill={total === 0 ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
                textAnchor="middle"
                opacity={total === 0 ? 0.4 : 1}
              >
                {key === 'Levantamento' ? 'Levant.' : key}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Eficiência</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>Cálculo:</Text> (Nota 3 + Nota 2 - Nota 1 - Nota 0) ÷ Total.
            </Text>
            <Text variant="bodyMedium">
              Barras <Text style={{ color: positive, fontWeight: 'bold' }}>Verdes</Text> são positivas, <Text style={{ color: negative, fontWeight: 'bold' }}>Vermelhas</Text> negativas.
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
