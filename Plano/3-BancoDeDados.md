# Modelagem de Dados

## 1. Tabela: `users` (Firestore Only -> Local Auth State)
*   Utilizado para controle de acesso.
*   Campos:
    *   `uid` (PK): String (Firebase Auth ID)
    *   `email`: String
    *   `name`: String
    *   `role`: 'admin' | 'athlete'

## 2. Tabelas de Domínio (SQLite e Firestore)

### A. `teams`
Representa um time de vôlei.
*   `id`: String (UUID gerado localmente)
*   `name`: String
*   `city`: String (Opcional)
*   `created_at`: DateTime
*   `updated_at`: DateTime
*   `sync_status`: 'pending' | 'synced' (Apenas Local)

### B. `players`
Atletas vinculados a um time.
*   `id`: String (UUID)
*   `team_id`: String (FK -> teams.id)
*   `name`: String (Nome completo)
*   `surname`: String (Apelido/Nome na camisa)
*   `number`: Integer (Número da camisa)
*   `position`: String ('Ponteiro', 'Central', 'Oposto', 'Levantador', 'Líbero')
*   `cpf`: String (Opcional)
*   `rg`: String (Opcional)
*   `birthday`: Date (Opcional)
*   `height`: Float (Opcional)
*   `created_at`: DateTime
*   `sync_status`: 'pending' | 'synced' (Apenas Local)

### C. `matches` (Antigo "Scout")
Cabeçalho de uma partida scoutada.
*   `id`: String (UUID)
*   `team_id`: String (FK -> teams.id - O time que estamos analisando)
*   `opponent_name`: String
*   `date`: DateTime
*   `location`: String
*   `our_score`: Integer (Final)
*   `opponent_score`: Integer (Final)
*   `is_finished`: Boolean
*   `created_at`: DateTime
*   `sync_status`: 'pending' | 'synced' (Apenas Local)

### D. `match_actions`
Cada ação registrada durante o jogo. Tabela de alto volume.
*   `id`: String (UUID)
*   `match_id`: String (FK -> matches.id)
*   `player_id`: String (FK -> players.id, pode ser nulo para "Erro Adversário" genérico se desejar, ou usar um player "Placeholder")
*   `set_number`: Integer (1, 2, 3, 4, 5)
*   `action_type`: String ('Saque', 'Passe', 'Levantamento', 'Ataque', 'Bloqueio', 'Defesa')
*   `quality`: Integer (0, 1, 2, 3)
*   `score_change`: Integer (1 para ponto nosso, -1 para ponto deles, 0 para neutro - *Opcional, derivável da qualidade e tipo, mas bom para cache*)
*   `timestamp`: DateTime (Hora exata da ação)
*   `sync_status`: 'pending' | 'synced' (Apenas Local)

## 3. Estrutura no Firestore (NoSQL)
Para facilitar a sincronização, manteremos uma estrutura plana ou semi-plana.

*   `teams/{teamId}`
*   `players/{playerId}` (Com campo `teamId` para consultas)
*   `matches/{matchId}`
*   `matches/{matchId}/actions/{actionId}` (Sub-coleção é ideal aqui para não superlotar uma coleção raiz e facilitar o carregamento sob demanda de uma partida específica).

## 4. Mapeamento Local <-> Nuvem
*   Ao sincronizar, o App envia os registros com `sync_status = 'pending'`.
*   O App deve lidar com a exclusão lógica (Soft Delete) se necessário (campo `deleted_at`), para que a deleção se propague para a nuvem. Para MVP, deleção física no servidor e local pode bastar se bem coordenada.
