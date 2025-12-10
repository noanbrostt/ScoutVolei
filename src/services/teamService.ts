import { db } from '../database/db';
import { teams, players } from '../database/schemas';
import { eq, desc, and } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const teamService = {
  getAll: async () => {
    const allTeams = await db.select().from(teams).where(eq(teams.deleted, false)).orderBy(desc(teams.createdAt));
    
    // Get all players that are pending
    const pendingPlayers = await db.select({ teamId: players.teamId })
                                   .from(players)
                                   .where(and(eq(players.syncStatus, 'pending'), eq(players.deleted, false)));
    
    const teamsWithPendingPlayers = new Set(pendingPlayers.map(p => p.teamId));

    return allTeams.map(team => ({
        ...team,
        hasPendingData: team.syncStatus === 'pending' || teamsWithPendingPlayers.has(team.id)
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
