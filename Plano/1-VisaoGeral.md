# Visão Geral do Projeto: Novo App de Scout de Vôlei

## 1. Introdução
Este projeto visa reescrever do zero o aplicativo de Scout de Vôlei, focando em arquitetura limpa, suporte offline robusto ("Local-First") e uma interface moderna e personalizável. O objetivo é substituir planilhas de Excel e o app antigo por uma solução profissional para uso em quadra.

## 2. Perfis de Usuário
O sistema terá dois tipos de usuários, com permissões distintas:

### A. Admin (Técnico/Estatístico)
*   **Acesso Total:** CRUD de Times, Atletas e Partidas (Scouts).
*   **Scout:** Pode iniciar e registrar scouts de partidas.
*   **Sincronização:** Responsável por enviar os dados locais para a nuvem (Firebase).
*   **Exportação:** Gera relatórios PDF e listas de atletas.

### B. Atleta
*   **Acesso Leitura:** Visualiza times e lista de atletas.
*   **Relatórios:** Visualiza os relatórios e estatísticas dos jogos já sincronizados.
*   **Restrição:** Não pode criar scouts ou editar dados cadastrais.

## 3. Funcionalidades Principais
1.  **Gestão de Times e Atletas:**
    *   Cadastro completo de atletas (Nome, RG, CPF, Data Nasc., Posição, etc.).
    *   Associação de atletas a times.
    *   **Exportação de Texto:** Gerar listas formatadas (ex: Nome + RG) para envio via WhatsApp.
2.  **Scout (Registro de Partida):**
    *   Interface otimizada (provavelmente Landscape) para registro rápido.
    *   Fluxo: Selecionar Jogador -> Ação -> Nota (0-3).
    *   Cálculo automático de pontuação do jogo baseado na nota.
    *   Substituições de jogadores em tempo real.
    *   **Funciona 100% Offline.**
3.  **Relatórios e Estatísticas:**
    *   Visualização de dados agregados (Jogo todo) e segregados (por Set).
    *   Métricas: Eficiência por fundamento, % de Ataque, % de Contra-ataque.
    *   Gráficos: Radar (Fundamentos), Barras (Qualidade das ações).
4.  **Exportação PDF:**
    *   Gerar documento completo com todas as tabelas e gráficos da partida para compartilhamento.
5.  **Personalização UI:**
    *   O usuário pode definir uma cor de tema (Primary Color) e alternar entre Dark/Light mode.

## 4. Diferenciais Técnicos (Requisitos)
*   **Offline-First:** O app deve abrir e funcionar plenamente sem internet. Os dados são salvos no dispositivo e sincronizados quando houver conexão e comando do usuário.
*   **Código Limpo:** Arquitetura bem definida, tipagem forte (TypeScript) e documentação.
