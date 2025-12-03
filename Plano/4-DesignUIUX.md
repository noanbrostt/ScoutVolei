# Design System e UX

## 1. Estilo Visual "Template"
O usuário deseja um visual limpo, profissional e personalizável, fugindo da "cara de projeto de estudo".

*   **Biblioteca Base:** **React Native Paper (v5)**.
    *   Oferece componentes prontos (AppBars, FABs, Cards, Dialogs) que seguem diretrizes de design sólidas.
*   **Personalização:**
    *   Criar um `ThemeContext`.
    *   O usuário pode escolher uma `PrimaryColor` nas configurações (Ex: Azul, Vermelho, Verde, Laranja).
    *   Todo o app deve reagir a essa cor (Botões, Headers, Destaques).
    *   Suporte nativo a **Dark Mode** e **Light Mode** (respeitando configuração do sistema ou override manual).

## 2. Layouts Específicos

### A. Tela de Scout (Modo Paisagem/Landscape)
Esta é a tela mais crítica. Deve ser densa em informação mas fácil de tocar.
*   **Esquerda (50%):**
    *   Lista vertical dos 6 jogadores em quadra (Titulares).
    *   Cada item deve mostrar: Nome/Apelido e Camisa.
    *   Deve ser fácil de "Selecionar" um jogador.
    *   Botão de "Substituição" visível.
*   **Direita (50%):**
    *   **Botões de Ação:** Grade de botões grandes (Ataque, Bloqueio, Saque, Defesa, Passe, Levantamento).
    *   **Botões de Qualidade:** Botões coloridos (0=Vermelho, 1=Laranja, 2=Amarelo, 3=Verde).
    *   **Placar:** Visível no topo, com botões de + e - manuais caso precise corrigir.
    *   **Log Recente:** Uma pequena lista rolavel mostrando as últimas 3 ações para conferência rápida.

### B. Relatórios (Charts)
*   Usar cartões (Cards) para separar seções.
*   **Gráfico de Radar:** Visualmente impactante para mostrar o perfil do time/jogador.
*   **Tabelas:** Devem ter rolagem horizontal se tiverem muitas colunas, com a primeira coluna (Nome/Fundamento) fixa se possível (Sticky).

### C. Tela de Login
*   Simples, com logo do App.
*   Inputs com validação visível.
*   Opção de "Esqueci minha senha".

## 3. Fluxo de Criação de Time
*   Wizard ou Formulário de etapa única.
*   Ao criar time, já sugerir adicionar jogadores.
*   Importação de contatos ou adição manual rápida.

## 4. Navegação
*   Evitar "Deep Nesting" onde o usuário se perde.
*   Usar "Modais" para edições rápidas (editar nome de jogador) para não sair do contexto da lista.
