import { View, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Appbar, SegmentedButtons, Chip, Divider, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { teamService } from '../../../src/services/teamService';
import { playerService } from '../../../src/services/playerService';
import { treasuryService } from '../../../src/services/treasuryService';
import { syncService } from '../../../src/services/syncService';

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDate = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

type AtletaParcela = { atletaId: string; nome: string; teamColor: string; totalParcelas: number };

export default function NewEvent() {
  const theme = useTheme();
  const router = useRouter();

  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [atletasParcelas, setAtletasParcelas] = useState<AtletaParcela[]>([]);
  const [defaultParcelas, setDefaultParcelas] = useState(1);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'amistoso' | 'campeonato'>('amistoso');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showInicioPicker, setShowInicioPicker] = useState(false);
  const [showFimPicker, setShowFimPicker] = useState(false);
  const [valorPorAtleta, setValorPorAtleta] = useState('');

  // Parcelas select modal
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectContext, setSelectContext] = useState<'default' | string>('default');

  useEffect(() => { teamService.getAll().then(setAllTeams); }, []);

  useEffect(() => {
    const load = async () => {
      if (selectedTeamIds.size === 0) { setAtletasParcelas([]); return; }
      const selectedTeams = allTeams.filter(t => selectedTeamIds.has(t.id));
      const all: AtletaParcela[] = [];
      for (const team of selectedTeams) {
        const athletes = await playerService.getByTeamId(team.id);
        for (const a of athletes) {
          all.push({
            atletaId: a.id,
            nome: a.surname?.trim() || a.name,
            teamColor: team.color,
            totalParcelas: defaultParcelas,
          });
        }
      }
      all.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setAtletasParcelas(all);
    };
    load();
  }, [selectedTeamIds]);

  const applyDefaultToAll = (n: number) => {
    setDefaultParcelas(n);
    setAtletasParcelas(prev => prev.map(a => ({ ...a, totalParcelas: n })));
  };

  const setAtletaParcelas = (atletaId: string, n: number) => {
    setAtletasParcelas(prev => prev.map(a => a.atletaId === atletaId ? { ...a, totalParcelas: n } : a));
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  const openSelect = (context: 'default' | string) => {
    setSelectContext(context);
    setSelectOpen(true);
  };

  const handleSelectParcelas = (n: number) => {
    if (selectContext === 'default') applyDefaultToAll(n);
    else setAtletaParcelas(selectContext, n);
    setSelectOpen(false);
  };

  const currentSelectValue = selectContext === 'default'
    ? defaultParcelas
    : (atletasParcelas.find(a => a.atletaId === selectContext)?.totalParcelas ?? 1);

  const handleSave = async () => {
    if (!nome.trim()) { Alert.alert('Campo obrigatório', 'Informe o nome do evento.'); return; }
    const valor = parseFloat(valorPorAtleta.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) { Alert.alert('Valor inválido', 'Informe o valor por atleta.'); return; }
    if (atletasParcelas.length === 0) { Alert.alert('Sem atletas', 'Selecione ao menos um time.'); return; }

    setSaving(true);
    try {
      await treasuryService.createEvent({
        nome: nome.trim(),
        tipo,
        teamIds: [...selectedTeamIds],
        dataInicio: toIsoDate(dataInicio),
        dataFim: dataFim ? toIsoDate(dataFim) : null,
        valorPorAtleta: valor,
        atletasParcelas: atletasParcelas.map(a => ({
          atletaId: a.atletaId,
          totalParcelas: a.totalParcelas,
          valorParcela: parseFloat((valor / a.totalParcelas).toFixed(2)),
        })),
      });
      syncService.triggerSync();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const selectLabel = (n: number) => n === 1 ? 'À vista' : `${n}x`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']}>
        <Appbar.Header statusBarHeight={0} style={{ backgroundColor: 'transparent', elevation: 0 }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Novo Evento" />
        </Appbar.Header>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Nome do evento"
          value={nome}
          onChangeText={setNome}
          mode="outlined"
          style={{ marginBottom: 16 }}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Tipo</Text>
        <SegmentedButtons
          value={tipo}
          onValueChange={v => setTipo(v as 'amistoso' | 'campeonato')}
          buttons={[
            { value: 'amistoso', label: 'Amistoso' },
            { value: 'campeonato', label: 'Campeonato' },
          ]}
          style={{ marginBottom: 16 }}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Times</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {allTeams.map(team => {
            const sel = selectedTeamIds.has(team.id);
            return (
              <TouchableOpacity
                key={team.id}
                onPress={() => toggleTeam(team.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  borderWidth: 2,
                  borderColor: team.color,
                  backgroundColor: sel ? team.color : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: '500',
                  color: sel ? '#fff' : team.color,
                }}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dates on same row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ marginBottom: 6 }}>Início</Text>
            <Chip compact icon="calendar" onPress={() => setShowInicioPicker(true)}
              style={{ alignSelf: 'flex-start' }}>
              {formatDate(dataInicio)}
            </Chip>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ marginBottom: 6 }}>Fim (opcional)</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Chip compact icon="calendar" onPress={() => setShowFimPicker(true)}
                style={{ alignSelf: 'flex-start' }}>
                {dataFim ? formatDate(dataFim) : '—'}
              </Chip>
              {dataFim && (
                <Chip compact mode="outlined" onPress={() => setDataFim(null)}>✕</Chip>
              )}
            </View>
          </View>
        </View>
        <View style={{ marginBottom: 16 }}>
          {showInicioPicker && (
            <DateTimePicker
              value={dataInicio}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowInicioPicker(Platform.OS === 'ios');
                if (date) setDataInicio(date);
              }}
            />
          )}
          {showFimPicker && (
            <DateTimePicker
              value={dataFim ?? dataInicio}
              mode="date"
              display="default"
              minimumDate={dataInicio}
              onChange={(_, date) => {
                setShowFimPicker(Platform.OS === 'ios');
                if (date) setDataFim(date);
              }}
            />
          )}
        </View>

        <TextInput
          label="Valor por atleta (R$)"
          value={valorPorAtleta}
          onChangeText={setValorPorAtleta}
          mode="outlined"
          keyboardType="decimal-pad"
          style={{ marginBottom: 20 }}
        />

        {atletasParcelas.length > 0 && (
          <>
            <Divider style={{ marginBottom: 16 }} />
            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 12 }}>Parcelas</Text>

            {/* Default select */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Padrão para todos:</Text>
              <TouchableOpacity
                onPress={() => openSelect('default')}
                style={{
                  flex: 1, borderWidth: 1, borderColor: theme.colors.outline,
                  borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {selectLabel(defaultParcelas)}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>▼</Text>
              </TouchableOpacity>
            </View>

            {atletasParcelas.map(a => {
              const valorParcela = valorPorAtleta
                ? (parseFloat(valorPorAtleta.replace(',', '.')) / a.totalParcelas).toFixed(2)
                : '—';
              return (
                <View key={a.atletaId} style={{
                  flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
                }}>
                  <View style={{
                    width: 6, height: 32, borderRadius: 3,
                    backgroundColor: a.teamColor, marginRight: 10,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{a.nome}</Text>
                    {valorPorAtleta ? (
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        {selectLabel(a.totalParcelas)} · R$ {valorParcela}/parcela
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => openSelect(a.atletaId)}
                    style={{
                      borderWidth: 1, borderColor: theme.colors.outline,
                      borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      minWidth: 76, backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                      {selectLabel(a.totalParcelas)}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>▼</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <View style={{ height: 16 }} />
          </>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={{ marginBottom: 32 }}
        >
          Criar Evento
        </Button>
      </ScrollView>

      {/* Parcelas select dialog */}
      <Portal>
        <Dialog visible={selectOpen} onDismiss={() => setSelectOpen(false)}>
          {selectContext !== 'default' && (
            <Dialog.Title>
              {atletasParcelas.find(a => a.atletaId === selectContext)?.nome}
            </Dialog.Title>
          )}
          <Dialog.ScrollArea style={{ maxHeight: 320, paddingHorizontal: 0 }}>
            <ScrollView>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleSelectParcelas(n)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 24,
                    borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant,
                  }}
                >
                  <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>
                    {selectLabel(n)}
                  </Text>
                  {currentSelectValue === n && (
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
}
