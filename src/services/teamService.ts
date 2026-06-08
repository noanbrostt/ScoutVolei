import { db } from '../database/db';
import { teams, players } from '../database/schemas';
import { eq, desc, asc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const teamService = {
  getAll: async () => {
    const allTeams = await db.select().from(teams).where(eq(teams.deleted, false)).orderBy(asc(teams.name));
    
    // All non-deleted players (for pending flag + per-team count)
    const allPlayers = await db.select({ teamId: players.teamId, syncStatus: players.syncStatus })
                               .from(players)
                               .where(eq(players.deleted, false));

    const teamsWithPendingPlayers = new Set(
      allPlayers.filter(p => p.syncStatus === 'pending').map(p => p.teamId)
    );
    const playerCounts = new Map<string, number>();
    for (const p of allPlayers) {
      playerCounts.set(p.teamId, (playerCounts.get(p.teamId) ?? 0) + 1);
    }

    return allTeams.map(team => ({
        ...team,
        hasPendingData: team.syncStatus === 'pending' || teamsWithPendingPlayers.has(team.id),
        playerCount: playerCounts.get(team.id) ?? 0,
    }));
  },
  
  getById: async (id: string) => {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  },

  create: async (name: string, color: string = '#2196F3') => {
    const newTeam = {
      id: Crypto.randomUUID(),
      name,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    };
    await db.insert(teams).values(newTeam);
    return newTeam;
  },

  update: async (id: string, data: Partial<{ name: string; color: string }>) => {
    await db.update(teams)
      .set({ 
        ...data, 
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' 
      })
      .where(eq(teams.id, id));
  },

  delete: async (id: string) => {
    // Mark related players for soft delete first
    await db.update(players)
      .set({ deleted: true, syncStatus: 'pending' })
      .where(eq(players.teamId, id));
      
    // Then mark the team for soft delete
    await db.update(teams)
      .set({ deleted: true, syncStatus: 'pending' })
      .where(eq(teams.id, id));
  }
};
