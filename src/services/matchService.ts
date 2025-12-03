import { db } from '../database/db';
import { matches, matchActions } from '../database/schemas';
import { eq, desc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export const matchService = {
  create: async (teamId: string, opponentName: string, location?: string) => {
    const newMatch = {
      id: Crypto.randomUUID(),
      teamId,
      opponentName,
      date: new Date().toISOString(),
      location,
      ourScore: 0,
      opponentScore: 0,
      isFinished: false,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    };
    await db.insert(matches).values(newMatch);
    return newMatch;
  },

  getById: async (matchId: string) => {
    const res = await db.select().from(matches).where(eq(matches.id, matchId));
    return res[0];
  },

  getAll: async () => {
    return await db.select().from(matches).orderBy(desc(matches.date));
  },

  // Action Logic
  addAction: async (data: { 
    matchId: string, 
    playerId: string | null, 
    setNumber: number, 
    actionType: string, 
    quality: number,
    scoreChange: number 
  }) => {
    const newAction = {
      id: Crypto.randomUUID(),
      ...data,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending' as const,
    };
    
    await db.transaction(async (tx) => {
      await tx.insert(matchActions).values(newAction);
      
      // Update match score if needed
      if (data.scoreChange !== 0) {
        const match = await tx.select().from(matches).where(eq(matches.id, data.matchId)).get();
        if (match) {
            if (data.scoreChange > 0) {
                await tx.update(matches).set({ ourScore: (match.ourScore || 0) + 1 }).where(eq(matches.id, data.matchId));
            } else {
                await tx.update(matches).set({ opponentScore: (match.opponentScore || 0) + 1 }).where(eq(matches.id, data.matchId));
            }
        }
      }
    });
    
    return newAction;
  },
  
  undoLastAction: async (matchId: string) => {
      // Logic to undo last action and revert score
      // This is complex, skipping for MVP initial implementation but acknowledging need.
  }
};
