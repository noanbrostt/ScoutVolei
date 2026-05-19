import { View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Appbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { playerService } from '../../../src/services/playerService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';

const toDisplayDate = (isoDate: string | null): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const toIsoDate = (ddmmyyyy: string): string | null => {
  const parts = ddmmyyyy.trim().replace(/\s/g, '').split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return iso;
};

const displayMonth = (mesRef: string) => {
  const [y, m] = mesRef.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  const s = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function PaymentForm() {
  const theme = useTheme();
  const router = useRouter();
  const { atletaId, mesReferencia, teamId } = useLocalSearchParams<{
    atletaId: string;
    mesReferencia: string;
    teamId: string;
  }>();

  const [atleta, setAtleta] = useState<any>(null);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [dataPagamento, setDataPagamento] = useState('');
  const [valorBase, setValorBase] = useState('');
  const [valorSolidario, setValorSolidario] = useState('0');
  const [valorJuros, setValorJuros] = useState('0');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    const load = async () => {
      const [p, payment, feeConfig] = await Promise.all([
        playerService.getById(atletaId),
        treasuryService.getPayment(atletaId, mesReferencia),
        treasuryService.getFeeConfig(teamId),
      ]);
      setAtleta(p);
      setExistingPayment(payment ?? null);
      if (payment) {
        setDataPagamento(toDisplayDate(payment.dataPagamento));
        setValorBase(String(payment.valorBase));
        setValorSolidario(String(payment.valorSolidario));
        setValorJuros(String(payment.valorJuros));
        setObservacao(payment.observacao ?? '');
      } else if (feeConfig) {
        setValorBase(String(feeConfig.valorBase));
      }
    };
    load();
  }, [atletaId, mesReferencia, teamId]);

  const handleSave = async () => {
    const isoDate = dataPagamento.trim() ? toIsoDate(dataPagamento) : null;
    if (dataPagamento.trim() && !isoDate) {
      Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }
    const base = parseFloat(valorBase.replace(',', '.'));
    if (isNaN(base) || base < 0) {
      Alert.alert('Valor inválido', 'Informe um valor base válido.');
      return;
    }
    setSaving(true);
    try {
      await treasuryService.savePayment({
        id: existingPayment?.id,
        atletaId,
        teamId,
        mesReferencia,
        valorBase: base,
        valorSolidario: parseFloat(valorSolidario.replace(',', '.')) || 0,
        valorJuros: parseFloat(valorJuros.replace(',', '.')) || 0,
        dataPagamento: isoDate,
        observacao: observacao.trim() || null,
      });
      syncService.triggerSync();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remover registro',
      'Tem certeza que deseja remover este registro de pagamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await treasuryService.deletePayment(existingPayment.id);
            syncService.triggerSync();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content
            title={displayMonth(mesReferencia)}
            subtitle={atleta ? `${atleta.name}${atleta.surname ? ' ' + atleta.surname : ''}` : ''}
          />
        </Appbar.Header>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Data do pagamento (DD/MM/AAAA)"
          value={dataPagamento}
          onChangeText={setDataPagamento}
          mode="outlined"
          placeholder="Deixe em branco para salvar como pendente"
          keyboardType="numeric"
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Valor base (R$)"
          value={valorBase}
          onChangeText={setValorBase}
          mode="outlined"
          keyboardType="decimal-pad"
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Valor solidário (R$)"
          value={valorSolidario}
          onChangeText={setValorSolidario}
          mode="outlined"
          keyboardType="decimal-pad"
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Valor de juros (R$)"
          value={valorJuros}
          onChangeText={setValorJuros}
          mode="outlined"
          keyboardType="decimal-pad"
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Observação"
          value={observacao}
          onChangeText={setObservacao}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={{ marginBottom: 24 }}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={{ marginBottom: 12 }}
        >
          Salvar
        </Button>

        {existingPayment && (
          <>
            <Divider style={{ marginBottom: 12 }} />
            <Button
              mode="outlined"
              textColor={theme.colors.error}
              onPress={handleDelete}
            >
              Remover registro
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}
