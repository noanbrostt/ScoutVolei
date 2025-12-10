import { firestoreDb } from '../services/firebaseConfig';
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, writeBatch, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../database/db';
import { teams, players, matches, matchActions } from '../database/schemas';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('syncService loaded. firestoreDb initialized.');

const SYNC_INTERVAL_MS = 60000; // 1 minute
const LAST_SYNC_KEY = 'last_sync_timestamp';

// Helper to convert Drizzle schema to Firestore document
const toFirestoreDoc = (item: any) => {
    const { syncStatus, deleted, ...rest } = item;
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

    syncAll: async () => {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected || !networkState.isInternetReachable) {
            console.log('Offline, skipping sync.');
            return;
        }

        console.log('Starting sync cycle...');
        try {
            // 1. PUSH: Send local changes to Firestore
            await db.transaction(async (tx) => {
                await syncService.syncDeleted(tx);
                await syncService.syncTeams(tx);
                await syncService.syncPlayers(tx);
                await syncService.syncMatches(tx);
                await syncService.syncMatchActions(tx);
            });

            // 2. PULL: Get remote changes from Firestore
            await syncService.pullFromFirestore();

            console.log('Sync cycle finished successfully.');
            syncService.notifyListeners();
        } catch (error) {
            console.error('Error during sync cycle:', error);
        }
    },

    // --- PUSH METHODS (Local -> Cloud) ---

    syncDeleted: async (tx: any) => {
        const collections = [
            { name: 'matchActions', table: matchActions },
            { name: 'matches', table: matches },
            { name: 'players', table: players },
            { name: 'teams', table: teams },
        ];

        for (const { name, table } of collections) {
            const deletedLocal = await tx.select().from(table).where(and(eq(table.deleted, true), eq(table.syncStatus, 'pending')));
            
            for (const item of deletedLocal) {
                try {
                    const docRef = doc(firestoreDb, name, item.id);
                    await deleteDoc(docRef);
                    await physicallyDeleteLocal(tx, table, item.id);
                    console.log(`Deleted ${name} ${item.id} from cloud and local.`);
                } catch (error: any) {
                    if (error.code === 'not-found') {
                        await physicallyDeleteLocal(tx, table, item.id);
                    } else {
                        console.error(`Failed to delete ${name} ${item.id}:`, error);
                    }
                }
            }
        }
    },

    syncTeams: async (tx: any) => {
        const teamsToSync = await tx.select().from(teams).where(and(eq(teams.syncStatus, 'pending'), eq(teams.deleted, false)));
        for (const team of teamsToSync) {
            try {
                const docRef = doc(firestoreDb, 'teams', team.id);
                await setDoc(docRef, toFirestoreDoc(team), { merge: true });
                await markAsSynced(tx, teams, team.id);
            } catch (error) {
                console.error(`Failed to sync team ${team.id}:`, error);
            }
        }
    },

    syncPlayers: async (tx: any) => {
        const playersToSync = await tx.select().from(players).where(and(eq(players.syncStatus, 'pending'), eq(players.deleted, false)));
        for (const player of playersToSync) {
            try {
                const docRef = doc(firestoreDb, 'players', player.id);
                await setDoc(docRef, toFirestoreDoc(player), { merge: true });
                await markAsSynced(tx, players, player.id);
            } catch (error) {
                console.error(`Failed to sync player ${player.id}:`, error);
            }
        }
    },

    syncMatches: async (tx: any) => {
        const matchesToSync = await tx.select().from(matches).where(and(eq(matches.syncStatus, 'pending'), eq(matches.deleted, false)));
        for (const match of matchesToSync) {
            try {
                const docRef = doc(firestoreDb, 'matches', match.id);
                await setDoc(docRef, toFirestoreDoc(match), { merge: true });
                await markAsSynced(tx, matches, match.id);
            } catch (error) {
                console.error(`Failed to sync match ${match.id}:`, error);
            }
        }
    },

    syncMatchActions: async (tx: any) => {
        // Sync all pending match actions immediately (point-by-point)
        const actionsToSync = await tx.select().from(matchActions).where(and(eq(matchActions.syncStatus, 'pending'), eq(matchActions.deleted, false)));
        
        for (const action of actionsToSync) {
            try {
                const docRef = doc(firestoreDb, 'matchActions', action.id);
                await setDoc(docRef, toFirestoreDoc(action), { merge: true });
                await markAsSynced(tx, matchActions, action.id);
            } catch (error) {
                console.error(`Failed to sync match action ${action.id}:`, error);
            }
        }
    },

    // --- PULL METHODS (Cloud -> Local) ---

    pullFromFirestore: async () => {
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        // Default to a very old date if never synced
        const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0); 
        const now = new Date().toISOString();

        console.log(`Pulling changes since ${lastSyncDate.toISOString()}...`);

        // Helper to upsert local
        const upsertLocal = async (table: any, data: any) => {
            const existing = await db.select().from(table).where(eq(table.id, data.id)).get();
            if (existing) {
                // Only update if remote is newer (optional conflict resolution, simple overwrite here)
                // Mark as synced immediately since it came from cloud
                await db.update(table).set({ ...data, syncStatus: 'synced' }).where(eq(table.id, data.id));
            } else {
                await db.insert(table).values({ ...data, syncStatus: 'synced' });
            }
        };

        // 1. Teams
        // Note: Firestore stores dates as ISO strings in our schema logic
        const teamsQ = query(collection(firestoreDb, 'teams'), where('updatedAt', '>', lastSyncDate.toISOString()));
        const teamsSnap = await getDocs(teamsQ);
        for (const doc of teamsSnap.docs) {
            const data = doc.data();
            await upsertLocal(teams, data);
        }

        // 2. Players
        const playersQ = query(collection(firestoreDb, 'players'), where('updatedAt', '>', lastSyncDate.toISOString()));
        const playersSnap = await getDocs(playersQ);
        for (const doc of playersSnap.docs) {
            const data = doc.data();
            await upsertLocal(players, data);
        }

        // 3. Matches
        const matchesQ = query(collection(firestoreDb, 'matches'), where('updatedAt', '>', lastSyncDate.toISOString()));
        const matchesSnap = await getDocs(matchesQ);
        for (const doc of matchesSnap.docs) {
            const data = doc.data();
            await upsertLocal(matches, data);
        }

        // 4. Match Actions (using timestamp)
        const actionsQ = query(collection(firestoreDb, 'matchActions'), where('timestamp', '>', lastSyncDate.toISOString()));
        const actionsSnap = await getDocs(actionsQ);
        for (const doc of actionsSnap.docs) {
            const data = doc.data();
            await upsertLocal(matchActions, data);
        }

        // Update last sync time
        await AsyncStorage.setItem(LAST_SYNC_KEY, now);
        console.log(`Pull complete. Updated lastSync to ${now}`);
    },

    startPeriodicSync: () => {
        console.log(`Starting periodic sync every ${SYNC_INTERVAL_MS / 1000} seconds.`);
        setInterval(syncService.syncAll, SYNC_INTERVAL_MS);
    },

    // Event System for UI Reactivity
    listeners: [] as (() => void)[],
    
    subscribe: (listener: () => void) => {
        syncService.listeners.push(listener);
        return () => {
            syncService.listeners = syncService.listeners.filter(l => l !== listener);
        };
    },

    notifyListeners: () => {
        syncService.listeners.forEach(l => l());
    }
};