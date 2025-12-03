# Arquitetura do Projeto

## 1. Stack Tecnológica
*   **Framework:** React Native (via **Expo**).
    *   *Justificativa:* Facilidade de configuração, OTA updates se necessário, e excelente suporte a bibliotecas nativas.
*   **Linguagem:** TypeScript (Estrito).
*   **Banco de Dados Local (Offline):** `expo-sqlite` com `drizzle-orm` (ou Kysely).
    *   *Justificativa:* SQL é robusto para relacionamentos (Times <-> Jogadores <-> Ações). O Drizzle fornece uma camada segura e tipada sobre o SQLite.
*   **Banco de Dados Remoto (Sync):** Firebase Firestore.
    *   *Justificativa:* Gratuito (tier spark), flexível e já utilizado anteriormente.
*   **Gerenciamento de Estado:** **Zustand**.
    *   *Justificativa:* Menos boilerplate que Redux, perfeito para gerenciar estado global de UI (tema, usuário logado) e cache temporário.
*   **Navegação:** **Expo Router**.
    *   *Justificativa:* Roteamento baseado em arquivos (File-system based), padrão atual do Expo.
*   **UI Library:** **React Native Paper** (v5).
    *   *Justificativa:* Implementação fiel do Material Design, suporte a temas (Dark/Light), componentes prontos de alta qualidade.
*   **Gráficos:** `victory-native` ou `react-native-gifted-charts`.
    *   *Recomendação:* `react-native-gifted-charts` pela facilidade de customização e visual moderno.

## 2. Estrutura de Pastas Proposta
```
/app                    # Rotas do Expo Router
  /(auth)               # Rotas de Login/Registro
  /(app)                # Rotas Logadas (Tabs/Drawer)
    /home
    /teams
    /scout              # Fluxo de Scout (pode esconder a tab bar)
    /reports
/src
  /components           # Componentes de UI Reutilizáveis (Botões, Cards, Inputs)
  /database             # Configuração do SQLite e Schemas Drizzle
    /schemas            # Definição das tabelas locais
    /sync               # Lógica de Sincronização (Local <-> Firestore)
  /services             # Serviços externos (Firebase Auth, PDF Generator)
  /store                # Stores do Zustand (ThemeStore, AuthStore)
  /theme                # Configurações de Cores e Tema do Paper
  /utils                # Funções auxiliares (Formatadores, Lógica de Scout)
  /types                # Definições de Tipos globais
```

## 3. Estratégia "Offline-First" (Local-First)
A regra de ouro é: **A UI sempre lê e escreve no SQLite Local.**

1.  **Leitura:** As telas consultam o banco SQLite local. Não há `useEffect` chamando Firestore diretamente nas telas de lista ou scout.
2.  **Escrita:** Ao criar um time ou registrar um ponto, o dado é salvo no SQLite com uma flag `sync_status = 'pending'`.
3.  **Sincronização (Sync Service):**
    *   **Pull (Nuvem -> Local):** Ao fazer login ou clicar em "Atualizar", o app baixa do Firestore dados novos/modificados e atualiza o SQLite.
    *   **Push (Local -> Nuvem):** O app busca no SQLite registros com `sync_status = 'pending'`, envia para o Firestore, e se sucesso, atualiza localmente para `sync_status = 'synced'`.
    *   *Conflitos:* Para simplificar, em caso de conflito de edição, o servidor (Firestore) pode vencer, ou simplesmente "o último a escrever vence". Dado o caso de uso (um admin por time geralmente), conflitos serão raros.

## 4. Navegação
*   **Login:** Tela inicial.
*   **Dashboard (Tabs):**
    *   **Início:** Resumo, atalho para Novo Scout.
    *   **Times:** Lista de times (CRUD). -> Detalhe do Time (Lista de Atletas).
    *   **Histórico:** Lista de Scouts (Partidas) anteriores.
    *   **Perfil/Config:** Troca de tema, Logout, Status do Sync.
*   **Modo Scout (Stack):**
    *   Ao iniciar uma partida, abre uma tela em **Landscape** (Forçada) que ocupa toda a tela (Full Screen).
    *   Ao finalizar, volta para o histórico.
