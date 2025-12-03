import { db } from '../database/db';
import { teams, players, matches, matchActions } from '../database/schemas';
import { firestore } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { eq } from 'drizzle-orm';

export const syncService = {
  uploadPending: async () => {
    try {
        // Teams
        const pendingTeams = await db.select().from(teams).where(eq(teams.syncStatus, 'pending'));
        for (const item of pendingTeams) {
            // Exclude syncStatus from firestore payload if desired, or keep it as metadata
            await setDoc(doc(firestore, 'teams', item.id), { ...item, syncStatus: 'synced' });
            await db.update(teams).set({ syncStatus: 'synced' }).where(eq(teams.id, item.id));
        }

        // Players
        const pendingPlayers = await db.select().from(players).where(eq(players.syncStatus, 'pending'));
        for (const item of pendingPlayers) {
            await setDoc(doc(firestore, 'players', item.id), { ...item, syncStatus: 'synced' });
            await db.update(players).set({ syncStatus: 'synced' }).where(eq(players.id, item.id));
        }

        // Matches
        const pendingMatches = await db.select().from(matches).where(eq(matches.syncStatus, 'pending'));
        for (const item of pendingMatches) {
            await setDoc(doc(firestore, 'matches', item.id), { ...item, syncStatus: 'synced' });
            await db.update(matches).set({ syncStatus: 'synced' }).where(eq(matches.id, item.id));
        }

        // Actions
        const pendingActions = await db.select().from(matchActions).where(eq(matchActions.syncStatus, 'pending'));
        // Actions might be too many for loop, better batching in production
        for (const item of pendingActions) {
             // Store actions in a subcollection or top level? Plan said subcollection is ideal but flat is easier for sync.
             // Using flat 'match_actions' collection for simplicity here, or `matches/{id}/actions/{id}`
             // Let's use subcollection logic
             await setDoc(doc(firestore, 'matches', item.matchId, 'actions', item.id), { ...item, syncStatus: 'synced' });
             await db.update(matchActions).set({ syncStatus: 'synced' }).where(eq(matchActions.id, item.id));
        }
        
        return true;
    } catch (error) {
        console.error("Sync Error:", error);
        throw error;
    }
  }
};
