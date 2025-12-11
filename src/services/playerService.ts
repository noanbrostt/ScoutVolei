import { db } from '../database/db';
import { players, teams } from '../database/schemas';
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
    surname: string | null,
    number: number | null,
    position: string,
    rg: string | null,
    cpf: string | null,
    birthday: string | null,
    allergies: string | null
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
  },

  getBirthdaysByMonth: async (month: number) => {
    const allPlayers = await db.select({
        player: players,
        teamName: teams.name
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(eq(players.deleted, false));

    const filtered = allPlayers.filter(row => {
        const bday = row.player.birthday;
        if (!bday) return false;
        
        let m = -1;
        // Support DD/MM/YYYY
        if (bday.includes('/')) {
           const parts = bday.split('/');
           if (parts.length >= 2) m = parseInt(parts[1], 10);
        } 
        // Support YYYY-MM-DD
        else if (bday.includes('-')) {
           const parts = bday.split('-');
           if (parts.length >= 2) m = parseInt(parts[1], 10);
        }
        
        return m === month;
    });

    // Helper to extract day
    const getDay = (dateStr: string) => {
        if (dateStr.includes('/')) return parseInt(dateStr.split('/')[0], 10);
        if (dateStr.includes('-')) return parseInt(dateStr.split('-')[2], 10);
        return 99;
    };

    // Sort by Day ASC
    filtered.sort((a, b) => {
        const dayA = getDay(a.player.birthday || '');
        const dayB = getDay(b.player.birthday || '');
        return dayA - dayB;
    });

    return filtered;
  }
};
