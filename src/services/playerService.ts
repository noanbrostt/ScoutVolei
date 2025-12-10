import { db } from '../database/db';
import { players } from '../database/schemas';
import { eq, asc, and } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const playerService = {
  getByTeamId: async (teamId: string) => {
    return await db.select().from(players)
      .where(and(eq(players.teamId, teamId), eq(players.deleted, false)));
  },

  create: async (data: { 
    teamId: string, 
    name: string, 
    surname?: string, 
    number: number, 
    position: string,
    rg?: string,
    cpf?: string,
    birthday?: string,
    allergies?: string
  }) => {
    const newPlayer = {
      id: Crypto.randomUUID(),
      teamId: data.teamId,
      name: data.name,
      surname: data.surname || null,
      number: data.number,
      position: data.position,
      rg: data.rg || null,
      cpf: data.cpf || null,
      birthday: data.birthday || null,
      allergies: data.allergies || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    };
    
    await db.insert(players).values(newPlayer);
    return newPlayer;
  },
  
  getById: async (id: string) => {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  },

  update: async (id: string, data: Partial<{
    name: string,
    surname: string,
    number: number,
    position: string,
    rg: string,
    cpf: string,
    birthday: string,
    allergies: string
  }>) => {
    await db.update(players)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      })
      .where(eq(players.id, id));
  },
  
  delete: async (id: string) => {
    await db.update(players)
      .set({ deleted: true, updatedAt: new Date().toISOString(), syncStatus: 'pending' })
      .where(eq(players.id, id));
  }
};
