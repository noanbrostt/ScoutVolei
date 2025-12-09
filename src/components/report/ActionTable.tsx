import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button, IconButton, useTheme, Surface } from 'react-native-paper';

interface ActionTableProps {
  data: {
    header: string[];
    data: (string | JSX.Element)[][];
    opponent: {
      errosAdversario: number; // Opponent Error -> Point for US
      pontosAdversario: number; // Opponent Point -> Point for THEM
    };
  };
}

export default function ActionTable({ data }: ActionTableProps) {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  return (
    <Surface style={[styles.cardContainer, { backgroundColor: theme.colors.surface, elevation: 2 }]} mode="elevated">
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Detalhado</Text>
        <IconButton 
            icon="help-circle-outline" 
            size={20} 
            onPress={() => setVisible(true)}
            style={{ margin: 0 }} 
            iconColor={theme.colors.onSurfaceVariant}
        />
      </View>

      <View style={[styles.tableBorder, { borderColor: theme.colors.outlineVariant }]}>
        {/* Header */}
        <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
            {data.header.map((head, index) => (
                <View key={index} style={[styles.cell, { flex: index === 0 ? 1.5 : 1 }]}>
                    <Text style={[styles.tableHeaderText, { color: theme.colors.onSurfaceVariant }]}>{head}</Text>
                </View>
            ))}
        </View>
        
        {/* Rows */}
        {data.data.map((rowData, rowIndex) => (
            <View key={rowIndex} style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }]}>
                {rowData.map((cellData, cellIndex) => (
                    <View key={cellIndex} style={[styles.cell, { flex: cellIndex === 0 ? 1.5 : 1 }]}>
                        {typeof cellData === 'string' ? (
                            <Text style={[styles.tableText, { color: theme.colors.onSurface }]}>{cellData}</Text>
                        ) : (
                            cellData
                        )}
                    </View>
                ))}
            </View>
        ))}
      </View>

      <View style={styles.opponentStats}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              Ponto Nosso (Erro Deles): <Text style={{fontWeight:'bold', color: theme.colors.primary}}>{data.opponent.errosAdversario}</Text>
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              Ponto Deles: <Text style={{fontWeight:'bold', color: theme.colors.error}}>{data.opponent.pontosAdversario}</Text>
          </Text>
      </View>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Detalhes</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>Atk (Ataque):</Text> Ataque realizado após um Passe (Side-out).
            </Text>
            <Text variant="bodyMedium">
              <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>C. Atk (Contra-Ataque):</Text> Ataque realizado após uma Defesa.
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
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center'
  },
  tableBorder: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    minHeight: 50,
    alignItems: 'center'
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  tableText: {
    fontSize: 12,
    textAlign: 'center',
  },
  opponentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 8
  }
});
