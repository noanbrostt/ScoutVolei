import { db } from '../database/db';
import { matches, matchActions, teams } from '../database/schemas';
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
    const res = await db.select({
        match: matches,
        teamName: teams.name
    })
    .from(matches)
    .leftJoin(teams, eq(matches.teamId, teams.id))
    .where(eq(matches.id, matchId));

    if (res[0]) {
        return {
            ...res[0].match,
            teamName: res[0].teamName
        };
    }
    return null;
  },

  getAll: async () => {
      // Fetch matches joined with team name
      const matchesData = await db.select({
          match: matches,
          teamName: teams.name
      })
      .from(matches)
      .leftJoin(teams, eq(matches.teamId, teams.id))
      .where(eq(matches.deleted, false)) // Filter out deleted matches
      .orderBy(desc(matches.date));

      // Calculate set scores for each match
      // Note: This is a heavy operation for a long list, but optimized for MVP.
      // In a production app with huge data, this should be pre-calculated in DB columns.
      const allActions = await db.select({
          matchId: matchActions.matchId,
          setNumber: matchActions.setNumber,
          scoreChange: matchActions.scoreChange
      }).from(matchActions);

      return matchesData.map(row => {
          const mActions = allActions.filter(a => a.matchId === row.match.id);
          
          // Group by Set
          const setScores: Record<number, { us: number, them: number }> = {};
          
          mActions.forEach(a => {
              if (!setScores[a.setNumber]) setScores[a.setNumber] = { us: 0, them: 0 };
              const change = a.scoreChange || 0;
              if (change > 0) setScores[a.setNumber].us++;
              if (change < 0) setScores[a.setNumber].them++;
          });

          // Calculate Sets Won
          let setsUs = 0;
          let setsThem = 0;
          
          Object.values(setScores).forEach(score => {
              if (score.us > score.them) setsUs++;
              else if (score.them > score.us) setsThem++;
          });

          return {
              ...row.match,
              teamName: row.teamName || 'Meu Time',
              setsUs,
              setsThem
          };
      });
  },

  getActions: async (matchId: string) => {
    return await db.select().from(matchActions)
      .where(eq(matchActions.matchId, matchId))
      .orderBy(desc(matchActions.timestamp));
  },

  delete: async (matchId: string) => {
      await db.update(matches)
        .set({ deleted: true, syncStatus: 'pending' })
        .where(eq(matches.id, matchId));
      // No need to cascade delete matchActions here, sync service will handle it
  },

  deleteAction: async (actionId: string) => {
    // For local UI, immediately mark as deleted. Score revert will be handled by sync for Firestore consistency.
    await db.update(matchActions)
      .set({ deleted: true, syncStatus: 'pending' })
      .where(eq(matchActions.id, actionId));
  },

  updateAction: async (actionId: string, newQuality: number) => {
    // Update locally and mark for sync
    await db.update(matchActions).set({ 
        quality: newQuality, 
        syncStatus: 'pending',
        // scoreChange needs to be recalculated based on newQuality.
        // For simplicity with sync, let's assume sync service re-calculates or uses previous value.
        // The service will read current values and send.
    }).where(eq(matchActions.id, actionId));
  },

  updateActionDetails: async (actionId: string, newActionType: string, newQuality: number) => {
    // Update locally and mark for sync
    await db.update(matchActions).set({ 
        actionType: newActionType, 
        quality: newQuality, 
        syncStatus: 'pending',
        // scoreChange needs to be recalculated based on newActionType and newQuality.
        // For simplicity with sync, assume sync service re-calculates or uses previous.
    }).where(eq(matchActions.id, actionId));
  },

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
    
    // Insert locally and mark for sync. Score update in matches will be part of sync.
    await db.insert(matchActions).values(newAction);
    
    // Local score display will need to adapt to not directly update match scores in DB
    // but read from recentActions or calculate dynamically for current set.
    // For now, removing direct match score update from here to avoid conflicts with sync logic.
    // The match scores should ideally be calculated by the sync service when sending to Firestore,
    // or by the app based on received actions.
    
    return newAction;
  },
  
  undoLastAction: async (matchId: string) => {
      // Logic to undo last action and revert score
      // This is complex, skipping for MVP initial implementation but acknowledging need.
  },

  finish: async (matchId: string) => {
    await db.update(matches).set({ isFinished: true, syncStatus: 'pending' }).where(eq(matches.id, matchId));
  }
};