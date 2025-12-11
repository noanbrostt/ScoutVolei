import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

// --- TYPES ---
interface PieChartProps {
  counts: { 0: number; 1: number; 2: number; 3: number };
  title: string;
  size?: number;
}

// --- CONSTANTS ---
const PIE_COLORS = {
    3: '#2E7D32', // Dark Green
    2: '#81C784', // Light Green
    1: '#FDD835', // Yellow
    0: '#C62828'  // Red
};
const EMPTY_COLOR = '#cccccc';

// --- SVG HELPERS ---
const getCoords = (angleDeg: number, radius: number, center: number) => {
    const angleRad = (angleDeg - 90) * Math.PI / 180.0; // -90 to make 0 at top
    return {
        x: center + (radius * Math.cos(angleRad)),
        y: center + (radius * Math.sin(angleRad))
    };
};

export default function SplitPieChart({ counts, title, size = 150 }: PieChartProps) {
  const theme = useTheme();
  
  // Add padding to avoid clipping text
  const padding = 20;
  const viewBoxSize = size + padding * 2;
  const center = viewBoxSize / 2;
  const radius = size * 0.4; // Radius relative to original size intent
  
  const total = counts[0] + counts[1] + counts[2] + counts[3];

  // No data state
  if (total === 0) {
    return (
      <View style={{ width: viewBoxSize, height: viewBoxSize, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text variant="labelMedium" style={{ marginBottom: 4, color: theme.colors.outline }}>{title}</Text>
        <Svg width={viewBoxSize} height={viewBoxSize}>
            <Circle cx={center} cy={center} r={radius} fill={EMPTY_COLOR} />
            <SvgText x={center} y={center} textAnchor="middle" alignmentBaseline="middle" fill="#666" fontSize="12">Sem dados</SvgText>
        </Svg>
      </View>
    );
  }

  // 100% dominance state
  for (let q = 0; q <= 3; q++) {
    if (counts[q as keyof typeof counts] === total) {
        const textColor = (q === 1) ? '#333' : 'white';
        return (
            <View style={{ width: viewBoxSize, height: viewBoxSize, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Text variant="labelMedium" style={{ marginBottom: -2, color: theme.colors.onSurface }}>{title}</Text>
                <Svg width={viewBoxSize} height={viewBoxSize}>
                    <Circle cx={center} cy={center} r={radius} fill={PIE_COLORS[q as keyof typeof PIE_COLORS]} />
                    <SvgText x={center} y={center} textAnchor="middle" alignmentBaseline="middle" fill={textColor} fontSize="14" fontWeight="bold">
                        {`${counts[q as keyof typeof counts]} - 100%`}
                    </SvgText>
                </Svg>
            </View>
        );
    }
  }

  // Mixed Slices
  const paths: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  let currentAngle = 0;

  // Clockwise (negatives)
  if (counts[0] > 0) {
    const deg = (counts[0] / total) * 360;
    const start = getCoords(currentAngle, radius, center);
    const end = getCoords(currentAngle + deg, radius, center);
    const mid = getCoords(currentAngle + deg / 2, radius * 0.65, center);
    const path = `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${deg > 180 ? 1 : 0},1 ${end.x},${end.y} Z`;
    
    paths.push(<Path key={0} d={path} fill={PIE_COLORS[0]} />);
    if (counts[0] / total > 0.05) {
        labels.push(
            <SvgText key="t0" x={mid.x + 2} y={mid.y} textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize={10} fontWeight="bold">
                {`${counts[0]} - ${Math.round((counts[0]/total)*100)}%`}
            </SvgText>
        );
    }
    currentAngle += deg;
  }
  if (counts[1] > 0) {
    const deg = (counts[1] / total) * 360;
    const start = getCoords(currentAngle, radius, center);
    const end = getCoords(currentAngle + deg, radius, center);
    const mid = getCoords(currentAngle + deg / 2, radius * 0.65, center);
    const path = `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${deg > 180 ? 1 : 0},1 ${end.x},${end.y} Z`;

    paths.push(<Path key={1} d={path} fill={PIE_COLORS[1]} />);
    if (counts[1] / total > 0.05) {
        labels.push(
            <SvgText key="t1" x={mid.x + 2} y={mid.y} textAnchor="middle" alignmentBaseline="middle" fill="#333" fontSize={10} fontWeight="bold">
                {`${counts[1]} - ${Math.round((counts[1]/total)*100)}%`}
            </SvgText>
        );
    }
  }

  // Counter-clockwise (positives)
  currentAngle = 0;
  if (counts[3] > 0) {
    const deg = (counts[3] / total) * 360;
    const startAngle = 360 - deg;
    const start = getCoords(startAngle, radius, center);
    const end = getCoords(360, radius, center);
    const mid = getCoords(startAngle + deg / 2, radius * 0.65, center);
    const path = `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${deg > 180 ? 1 : 0},1 ${end.x},${end.y} Z`;

    paths.push(<Path key={3} d={path} fill={PIE_COLORS[3]} />);
    if (counts[3] / total > 0.05) {
        labels.push(
            <SvgText key="t3" x={mid.x + 2} y={mid.y} textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize={10} fontWeight="bold">
                {`${counts[3]} - ${Math.round((counts[3]/total)*100)}%`}
            </SvgText>
        );
    }
    currentAngle = startAngle;
  } else {
    currentAngle = 360;
  }

  if (counts[2] > 0) {
    const deg = (counts[2] / total) * 360;
    const startAngle = currentAngle - deg;
    const start = getCoords(startAngle, radius, center);
    const end = getCoords(currentAngle, radius, center);
    const mid = getCoords(startAngle + deg / 2, radius * 0.65, center);
    const path = `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${deg > 180 ? 1 : 0},1 ${end.x},${end.y} Z`;

    paths.push(<Path key={2} d={path} fill={PIE_COLORS[2]} />);
    if (counts[2] / total > 0.05) {
        labels.push(
            <SvgText key="t2" x={mid.x + 2} y={mid.y} textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize={10} fontWeight="bold">
                {`${counts[2]} - ${Math.round((counts[2]/total)*100)}%`}
            </SvgText>
        );
    }
  }

  return (
    <View style={{ width: viewBoxSize, height: viewBoxSize, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text variant="labelMedium" style={{ marginBottom: -2, color: theme.colors.onSurface }}>{title}</Text>
        <Svg width={viewBoxSize} height={viewBoxSize}>
            {paths}
            {labels}
        </Svg>
    </View>
  );
}