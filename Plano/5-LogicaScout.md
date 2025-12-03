# Lógica de Negócio: Scout e Estatísticas

## 1. Regras de Pontuação (Scoring)
O sistema de pontuação deriva da combinação **Ação + Qualidade**.

### Ações
*   **Ofensivas:** Saque, Ataque.
*   **Defensivas/Transição:** Passe, Defesa, Bloqueio, Levantamento.

### Qualidades (0 a 3)
*   **0:** Erro. (Ponto do adversário).
*   **1:** Ação ruim/neutra (Bola em jogo, mas dificuldade para o time).
*   **2:** Ação boa (Facilitou a virada de bola ou dificultou para o adversário).
*   **3:** Ação Perfeita.

### Cálculo Automático do Placar
Durante o Scout, o placar deve mudar automaticamente nas seguintes condições:

1.  **Ponto Nosso (+1):**
    *   Ação = 'Ataque' E Qualidade = 3
    *   Ação = 'Bloqueio' E Qualidade = 3
    *   Ação = 'Saque' E Qualidade = 3
    *   Botão Manual "Erro do Adversário" (Gera ação genérica ou null player).

2.  **Ponto Adversário (Oponente +1):**
    *   Qualquer Ação com Qualidade = 0.
    *   Botão Manual "Ponto do Adversário" (Gera ação genérica).

## 2. Estatísticas Derivadas (Pós-processamento)
Estas estatísticas são calculadas lendo a lista cronológica de ações de um jogo.

### A. Eficiência (% de Sucesso)
*   Fórmula Geral: `(Total de Ações Nota 3 + Total de Ações Nota 2) / Total de Ações`
*   Fórmula Específica (Kill Rate - Ataque): `(Total Ataques Nota 3) / Total Ataques`
*   Fórmula Específica (Erro): `(Total Ações Nota 0) / Total Ações`

### B. Detecção de "Jogadas" Complexas
O sistema deve inferir o contexto baseando-se na sequência.
*   **Side-Out (Virada de Bola):** Começa com um 'Passe' do nosso time.
    *   Se `Passe` -> `Levantamento` -> `Ataque`, esse Ataque é classificado como **"Ataque de Virada (Side-out)"**.
*   **Contra-Ataque:** Começa com uma 'Defesa' do nosso time.
    *   Se `Defesa` -> `Levantamento` -> `Ataque`, esse Ataque é classificado como **"Ataque de Contra-Ataque"**.
*   Isso permite gerar estatísticas como: "Qual nossa eficiência de ataque quando o passe é perfeito (nota 3)?" vs "Quando o passe é quebrado (nota 1)?".

## 3. Exportação
### PDF
O PDF deve ser gerado localmente (biblioteca `expo-print`).
Estrutura do Relatório:
1.  **Cabeçalho:** Data, Local, Times, Placar Final.
2.  **Resumo do Jogo (Time):** Tabela com colunas (Ação | Total | Erros | Eficiência).
3.  **Resumo por Set (Time):** Mesma tabela, repetida para cada set jogado.
4.  **Detalhe por Atleta (Ordem Alfabética):**
    *   Nome do Atleta.
    *   Tabela de performance dele no jogo todo.
    *   Tabela de performance dele set a set (opcional, pode ficar muito longo).

### Texto (WhatsApp)
String simples formatada:
```
Lista de Atletas - [Nome do Time]
Jogo: [Data] vs [Oponente]

1. Nome Completo (RG: 12345)
2. Outro Nome (RG: 67890)
...
```
(Opção de escolher quais campos incluir: RG, CPF, Data Nasc).
