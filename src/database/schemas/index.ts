import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#2196F3'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  name: text('name').notNull(),
  surname: text('surname'),
  number: integer('number'),
  position: text('position').notNull(), // 'Ponteiro', 'Central', 'Oposto', 'Levantador', 'Líbero'
  cpf: text('cpf'),
  rg: text('rg'),
  birthday: text('birthday'),
  height: real('height'),
  allergies: text('allergies'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  opponentName: text('opponent_name').notNull(),
  date: text('date').notNull(),
  location: text('location'),
  ourScore: integer('our_score').default(0),
  opponentScore: integer('opponent_score').default(0),
  isFinished: integer('is_finished', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
  lineup: text('lineup'), // JSON array of player IDs currently on court
});

export const matchActions = sqliteTable('match_actions', {
  id: text('id').primaryKey(),
  matchId: text('match_id').references(() => matches.id).notNull(),
  playerId: text('player_id').references(() => players.id), // Can be null for generic/opponent errors
  setNumber: integer('set_number').notNull(),
  actionType: text('action_type').notNull(), // 'Saque', 'Passe', etc.
  quality: integer('quality').notNull(), // 0-3
  scoreChange: integer('score_change').default(0), // 1, -1, 0
  timestamp: text('timestamp').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

// ── Treasury ──────────────────────────────────────────────────────────────────

export const monthlyFeeConfig = sqliteTable('monthly_fee_config', {
  id: text('id').primaryKey(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  valorBase: real('valor_base').notNull(),
  valorJurosPorDia: real('valor_juros_por_dia').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  atletaId: text('atleta_id').references(() => players.id).notNull(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  mesReferencia: text('mes_referencia').notNull(), // YYYY-MM
  valorBase: real('valor_base').notNull(),
  valorSolidario: real('valor_solidario').notNull().default(0),
  valorJuros: real('valor_juros').notNull().default(0),
  dataPagamento: text('data_pagamento'), // YYYY-MM-DD manual, null = pendente
  valorPago: real('valor_pago'), // null = pagamento completo; < valorBase = parcial
  observacao: text('observacao'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

export const treasuryEvents = sqliteTable('treasury_events', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').$type<'amistoso' | 'campeonato'>().notNull(),
  teamIds: text('team_ids').notNull(), // JSON array of team IDs
  dataInicio: text('data_inicio').notNull(),
  dataFim: text('data_fim'),
  valorPorAtleta: real('valor_por_atleta').notNull(),
  observacao: text('observacao'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});

export const eventPayments = sqliteTable('event_payments', {
  id: text('id').primaryKey(),
  atletaId: text('atleta_id').references(() => players.id).notNull(),
  eventoId: text('evento_id').references(() => treasuryEvents.id).notNull(),
  numeroParcela: integer('numero_parcela').notNull(),
  totalParcelas: integer('total_parcelas').notNull(),
  valorParcela: real('valor_parcela').notNull(),
  dataPagamento: text('data_pagamento'), // auto-filled on mark paid (date not shown to user)
  valorPago: real('valor_pago'), // null = pagamento completo; < valorParcela = parcial
  observacao: text('observacao'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).default(false).notNull(),
});
