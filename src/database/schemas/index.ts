import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#2196F3'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id').references(() => teams.id).notNull(),
  name: text('name').notNull(),
  surname: text('surname'),
  number: integer('number').notNull(),
  position: text('position').notNull(), // 'Ponteiro', 'Central', 'Oposto', 'Levantador', 'Líbero'
  cpf: text('cpf'),
  rg: text('rg'),
  birthday: text('birthday'),
  height: real('height'),
  allergies: text('allergies'),
  createdAt: text('created_at').notNull(),
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
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
  syncStatus: text('sync_status').$type<'pending' | 'synced'>().default('pending').notNull(),
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
});
