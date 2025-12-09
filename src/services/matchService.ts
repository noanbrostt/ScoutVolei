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
    const res = await db.select().from(matches).where(eq(matches.id, matchId));
    return res[0];
  },

  getAll: async () => {
      // Fetch matches joined with team name
      const matchesData = await db.select({
          match: matches,
          teamName: teams.name
      })
      .from(matches)
      .leftJoin(teams, eq(matches.teamId, teams.id))
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
              if (a.scoreChange > 0) setScores[a.setNumber].us++;
              if (a.scoreChange < 0) setScores[a.setNumber].them++;
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
      await db.transaction(async (tx) => {
          await tx.delete(matchActions).where(eq(matchActions.matchId, matchId));
          await tx.delete(matches).where(eq(matches.id, matchId));
      });
  },

  deleteAction: async (actionId: string) => {
    await db.transaction(async (tx) => {
      const action = await tx.select().from(matchActions).where(eq(matchActions.id, actionId)).get();
      if (!action) return;

      // Revert score
      if (action.scoreChange !== 0) {
        const match = await tx.select().from(matches).where(eq(matches.id, action.matchId)).get();
        if (match) {
           if (action.scoreChange > 0) {
             await tx.update(matches).set({ ourScore: Math.max(0, (match.ourScore || 0) - 1) }).where(eq(matches.id, action.matchId));
           } else {
             await tx.update(matches).set({ opponentScore: Math.max(0, (match.opponentScore || 0) - 1) }).where(eq(matches.id, action.matchId));
           }
        }
      }

      // Delete action
      await tx.delete(matchActions).where(eq(matchActions.id, actionId));
    });
  },

  updateAction: async (actionId: string, newQuality: number) => {
    await db.transaction(async (tx) => {
        const action = await tx.select().from(matchActions).where(eq(matchActions.id, actionId)).get();
        if (!action) return;

        // Revert old score change
        if (action.scoreChange !== 0) {
            const match = await tx.select().from(matches).where(eq(matches.id, action.matchId)).get();
            if (match) {
                if (action.scoreChange > 0) { // Our point, decrement our score
                    await tx.update(matches).set({ ourScore: Math.max(0, (match.ourScore || 0) - 1) }).where(eq(matches.id, action.matchId));
                } else { // Opponent point, decrement opponent score
                    await tx.update(matches).set({ opponentScore: Math.max(0, (match.opponentScore || 0) - 1) }).where(eq(matches.id, action.matchId));
                }
            }
        }

        // Calculate new score change based on new quality and actionType (same as addAction logic)
        let newScoreChange = 0;
        if (newQuality === 3 && ['Ataque', 'Bloqueio', 'Saque'].includes(action.actionType)) {
            newScoreChange = 1;
        } else if (newQuality === 0) {
            newScoreChange = -1;
        }

        // Apply new score change
        if (newScoreChange !== 0) {
            const match = await tx.select().from(matches).where(eq(matches.id, action.matchId)).get();
            if (match) {
                if (newScoreChange > 0) { // Our point, increment our score
                    await tx.update(matches).set({ ourScore: (match.ourScore || 0) + 1 }).where(eq(matches.id, action.matchId));
                } else { // Opponent point, increment opponent score
                    await tx.update(matches).set({ opponentScore: Math.max(0, (match.opponentScore || 0) + 1) }).where(eq(matches.id, action.matchId));
                }
            }
        }

        // Update the action with new quality and scoreChange
        await tx.update(matchActions).set({ quality: newQuality, scoreChange: newScoreChange, syncStatus: 'pending' }).where(eq(matchActions.id, actionId));
    });
  },

  updateActionDetails: async (actionId: string, newActionType: string, newQuality: number) => {
    await db.transaction(async (tx) => {
        const action = await tx.select().from(matchActions).where(eq(matchActions.id, actionId)).get();
        if (!action) return;

        // Revert old score change
        if (action.scoreChange !== 0) {
            const match = await tx.select().from(matches).where(eq(matches.id, action.matchId)).get();
            if (match) {
                if (action.scoreChange > 0) { // Our point, decrement our score
                    await tx.update(matches).set({ ourScore: Math.max(0, (match.ourScore || 0) - 1) }).where(eq(matches.id, action.matchId));
                } else { // Opponent point, decrement opponent score
                    await tx.update(matches).set({ opponentScore: Math.max(0, (match.opponentScore || 0) - 1) }).where(eq(matches.id, action.matchId));
                }
            }
        }

        // Calculate new score change based on new quality and new actionType
        let newScoreChange = 0;
        if (newQuality === 3 && ['Ataque', 'Bloqueio', 'Saque'].includes(newActionType)) {
            newScoreChange = 1;
        } else if (newQuality === 0) {
            newScoreChange = -1;
        }

        // Apply new score change
        if (newScoreChange !== 0) {
            const match = await tx.select().from(matches).where(eq(matches.id, action.matchId)).get();
            if (match) {
                if (newScoreChange > 0) { // Our point, increment our score
                    await tx.update(matches).set({ ourScore: (match.ourScore || 0) + 1 }).where(eq(matches.id, action.matchId));
                } else { // Opponent point, increment opponent score
                    await tx.update(matches).set({ opponentScore: Math.max(0, (match.opponentScore || 0) + 1) }).where(eq(matches.id, action.matchId));
                }
            }
        }

        // Update the action with new quality and scoreChange
        await tx.update(matchActions).set({ 
            actionType: newActionType, 
            quality: newQuality, 
            scoreChange: newScoreChange, 
            syncStatus: 'pending' 
        }).where(eq(matchActions.id, actionId));
    });
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
  },

  finish: async (matchId: string) => {
    await db.update(matches).set({ isFinished: true, syncStatus: 'pending' }).where(eq(matches.id, matchId));
  }
};