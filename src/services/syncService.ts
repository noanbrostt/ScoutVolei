import { firestoreDb } from '../services/firebaseConfig';
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../database/db';
import { teams, players, matches, matchActions } from '../database/schemas';
import { eq, and } from 'drizzle-orm';
import * as Network from 'expo-network';

console.log('syncService loaded. firestoreDb:', firestoreDb); // DEBUG LINE

const SYNC_INTERVAL_MS = 10000; // Sync every 10 seconds

// Helper to convert Drizzle schema to Firestore document (stripping local-only fields)
const toFirestoreDoc = (item: any) => {
    const { syncStatus, deleted, ...rest } = item;
    // Firestore Timestamps are preferred, but local DB stores ISO strings.
    // For simplicity, we'll keep them as ISO strings for now to avoid conversion complexity.
    return rest;
};

// Helper to update local item as synced
const markAsSynced = async (tx: any, table: any, id: string) => {
    await tx.update(table)
        .set({ syncStatus: 'synced' })
        .where(eq(table.id, id));
};

// Helper to physically delete local item
const physicallyDeleteLocal = async (tx: any, table: any, id: string) => {
    await tx.delete(table).where(eq(table.id, id));
};


export const syncService = {

    /**
     * Orchestrates the entire synchronization process.
     */
    syncAll: async () => {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected || !networkState.isInternetReachable) {
            console.log('Offline, skipping sync.');
            return;
        }

        console.log('Starting sync...');
        try {
            await db.transaction(async (tx) => {
                // 1. Sync Deletions First (important to avoid re-uploading deleted items)
                await syncService.syncDeleted(tx);

                // 2. Sync Creates/Updates (order matters for foreign key dependencies)
                await syncService.syncTeams(tx);
                await syncService.syncPlayers(tx);
                await syncService.syncMatches(tx);
                await syncService.syncMatchActions(tx);
            });
            console.log('Sync finished successfully.');
        } catch (error) {
            console.error('Error during sync:', error);
            // Implement more sophisticated error handling (e.g., specific status for errors, retries)
        }
    },

    /**
     * Handles deletion of records that were soft-deleted locally.
     * Deletes from Firestore and then physically deletes from local DB.
     */
    syncDeleted: async (tx: any) => {
        console.log('Syncing deletions...');
        const collections = [
            { name: 'matchActions', table: matchActions },
            { name: 'matches', table: matches },
            { name: 'players', table: players },
            { name: 'teams', table: teams },
        ];

        // Process in reverse order of foreign key dependencies
        for (const { name, table } of collections) {
            const deletedLocal = await tx.select().from(table).where(and(eq(table.deleted, true), eq(table.syncStatus, 'pending')));
            if (deletedLocal.length > 0) console.log(`Found ${deletedLocal.length} deleted ${name} pending sync.`);

            for (const item of deletedLocal) {
                try {
                    const docRef = doc(firestoreDb, name, item.id);
                    await deleteDoc(docRef);
                    await physicallyDeleteLocal(tx, table, item.id);
                    console.log(`Deleted ${name} ${item.id} from Firestore and local DB.`);
                } catch (error: any) {
                    console.error(`Failed to delete ${name} ${item.id} from Firestore:`, error);
                    // If document not found in Firestore, it means it was already deleted or never existed.
                    // In that case, we can proceed to delete locally to clean up.
                    if (error.code === 'not-found') {
                        await physicallyDeleteLocal(tx, table, item.id);
                        console.log(`Document ${name} ${item.id} not found in Firestore, physically deleted locally.`);
                    }
                    // For other errors, keep as pending to retry
                }
            }
        }
    },

    /**
     * Syncs new/updated teams to Firestore.
     */
    syncTeams: async (tx: any) => {
        console.log('Syncing teams...');
        const teamsToSync = await tx.select().from(teams).where(and(eq(teams.syncStatus, 'pending'), eq(teams.deleted, false)));
        if (teamsToSync.length > 0) console.log(`Found ${teamsToSync.length} teams pending sync.`);

        for (const team of teamsToSync) {
            try {
                const docRef = doc(firestoreDb, 'teams', team.id);
                await setDoc(docRef, toFirestoreDoc(team), { merge: true });
                await markAsSynced(tx, teams, team.id);
                console.log(`Synced team ${team.id}`);
            } catch (error) {
                console.error(`Failed to sync team ${team.id}:`, error);
            }
        }
    },

    /**
     * Syncs new/updated players to Firestore.
     */
    syncPlayers: async (tx: any) => {
        console.log('Syncing players...');
        const playersToSync = await tx.select().from(players).where(and(eq(players.syncStatus, 'pending'), eq(players.deleted, false)));
        if (playersToSync.length > 0) console.log(`Found ${playersToSync.length} players pending sync.`);

        for (const player of playersToSync) {
            try {
                const docRef = doc(firestoreDb, 'players', player.id);
                await setDoc(docRef, toFirestoreDoc(player), { merge: true });
                await markAsSynced(tx, players, player.id);
                console.log(`Synced player ${player.id}`);
            } catch (error) {
                console.error(`Failed to sync player ${player.id}:`, error);
            }
        }
    },

    /**
     * Syncs new/updated matches to Firestore.
     */
    syncMatches: async (tx: any) => {
        console.log('Syncing matches...');
        const matchesToSync = await tx.select().from(matches).where(and(eq(matches.syncStatus, 'pending'), eq(matches.deleted, false)));
        if (matchesToSync.length > 0) console.log(`Found ${matchesToSync.length} matches pending sync.`);

        for (const match of matchesToSync) {
            try {
                const docRef = doc(firestoreDb, 'matches', match.id);
                await setDoc(docRef, toFirestoreDoc(match), { merge: true });
                await markAsSynced(tx, matches, match.id);
                console.log(`Synced match ${match.id}`);
            } catch (error) {
                console.error(`Failed to sync match ${match.id}:`, error);
            }
        }
    },

    /**
     * Syncs new/updated match actions to Firestore.
     */
    syncMatchActions: async (tx: any) => {
        console.log('Syncing match actions...');
        const actionsToSync = await tx.select().from(matchActions).where(and(eq(matchActions.syncStatus, 'pending'), eq(matchActions.deleted, false)));
        if (actionsToSync.length > 0) console.log(`Found ${actionsToSync.length} match actions pending sync.`);

        for (const action of actionsToSync) {
            try {
                const docRef = doc(firestoreDb, 'matchActions', action.id);
                await setDoc(docRef, toFirestoreDoc(action), { merge: true });
                await markAsSynced(tx, matchActions, action.id);
                console.log(`Synced match action ${action.id}`);
            } catch (error) {
                console.error(`Failed to sync match action ${action.id}:`, error);
            }
        }
    },

    // Function to start the periodic sync
    startPeriodicSync: () => {
        console.log(`Starting periodic sync every ${SYNC_INTERVAL_MS / 1000} seconds.`);
        setInterval(syncService.syncAll, SYNC_INTERVAL_MS);
    },
};