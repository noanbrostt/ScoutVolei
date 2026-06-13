// Mapa de posições de vôlei → abreviação (badge) + cor.
// As cores são padrão da identidade "Blues" para os badges de posição.

export const POSITION_COLORS = {
  LEV: '#3B82F6', // Levantador — azul
  PON: '#14B8A6', // Ponteiro — teal
  CEN: '#8B5CF6', // Central — roxo
  OPO: '#F59E0B', // Oposto — âmbar
  LIB: '#EC4899', // Líbero — rosa
} as const;

export type PositionAbbr = keyof typeof POSITION_COLORS;

// Nome completo (como salvo no banco) → abreviação do badge.
const FULL_TO_ABBR: Record<string, PositionAbbr> = {
  Levantador: 'LEV',
  Ponteiro: 'PON',
  Central: 'CEN',
  Oposto: 'OPO',
  Líbero: 'LIB',
  Libero: 'LIB',
};

export const positionAbbr = (position?: string | null): PositionAbbr =>
  (position && FULL_TO_ABBR[position]) || 'PON';

export const positionColor = (position?: string | null): string =>
  POSITION_COLORS[positionAbbr(position)];

// Fundo do badge quando não selecionado (cinza neutro por tema).
export const BADGE_INACTIVE = { dark: '#2A3044', light: '#DDE3EF' };
