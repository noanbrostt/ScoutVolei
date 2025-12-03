# Plano de Implementação Passo a Passo

## Fase 1: Setup Inicial e Infraestrutura
1.  Inicializar projeto Expo (Managed Workflow) com TypeScript e Expo Router.
2.  Configurar `NativeWind` (Tailwind) e `React Native Paper`.
3.  Configurar `Zustand` para gerenciamento de estado.
4.  Configurar `expo-sqlite` e `drizzle-orm` (criar migrations iniciais para tabelas `teams`, `players`, `matches`, `actions`).
5.  Configurar Firebase (apenas Auth por enquanto).
6.  Criar Tela de Login e Registro (integração Firebase Auth).

## Fase 2: CRUD Offline-First (Times e Atletas)
1.  Criar Repositories/Services para abstrair o banco SQLite.
2.  Criar Tela "Meus Times" (Lista).
3.  Criar Tela "Novo Time/Editar Time".
4.  Criar Tela "Detalhes do Time" (Lista de jogadores).
5.  Criar Tela "Novo Jogador".
6.  Implementar funcionalidade de "Exportar Lista" (Texto para Clipboard).
7.  **Teste:** Criar times e jogadores offline, reiniciar o app e verificar persistência.

## Fase 3: O "Coração" - Tela de Scout
1.  Configurar orientação de tela (Landscape) para rota `/scout`.
2.  Criar UI do Scout (Layout dividido, botões de ação).
3.  Implementar lógica de seleção (Jogador -> Ação -> Nota).
4.  Implementar lógica de "Ponto Genérico" (Adversário).
5.  Conectar lógica de pontuação ao estado local da partida.
6.  Salvar cada ação no SQLite em tempo real (`match_actions`).
7.  Implementar Substituições (Atualizar lista de jogadores ativos na tela).
8.  Implementar "Undo" (Remover última ação e reverter placar).

## Fase 4: Sincronização e Cloud
1.  Configurar Firestore no projeto.
2.  Implementar serviço de Sync:
    *   `uploadPendingData()`: Busca itens locais com `sync_status='pending'` e envia.
    *   `downloadRemoteData()`: Baixa dados do usuário logado e insere no SQLite.
3.  Adicionar indicador de status de sync na UI (ícone de nuvem com check ou loading).
4.  Garantir que IDs gerados localmente (UUIDs) sejam respeitados no Firestore.

## Fase 5: Relatórios e Visualização
1.  Criar Tela de Detalhes da Partida (pós-jogo).
2.  Implementar queries SQL complexas ou processamento em JS para agregar os dados (Counts, Eficiências).
3.  Integrar biblioteca de gráficos (`gifted-charts` ou `victory`).
4.  Criar gráficos de Radar e Barras.
5.  Implementar filtros (Por Set, Por Jogador).

## Fase 6: Polimento e Exportação PDF
1.  Implementar geração de HTML string baseado nos dados da partida.
2.  Usar `expo-print` para gerar PDF a partir do HTML.
3.  Adicionar botão de compartilhamento (`expo-sharing`).
4.  Revisão de UI/UX (Cores, Espaçamentos, Dark Mode).
