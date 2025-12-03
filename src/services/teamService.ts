import { db } from '../database/db';
import { teams } from '../database/schemas';
import { eq, desc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const teamService = {
  getAll: async () => {
    return await db.select().from(teams).orderBy(desc(teams.createdAt));
  },
  
  getById: async (id: string) => {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  },

  create: async (name: string, city?: string) => {
    const newTeam = {
      id: Crypto.randomUUID(),
      name,
      city,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    };
    await db.insert(teams).values(newTeam);
    return newTeam;
  },

  update: async (id: string, data: Partial<{ name: string; city: string }>) => {
    await db.update(teams)
      .set({ 
        ...data, 
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' 
      })
      .where(eq(teams.id, id));
  },

  delete: async (id: string) => {
    await db.delete(teams).where(eq(teams.id, id));
  }
};
