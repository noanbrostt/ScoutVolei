import { firestoreDb } from '../services/firebaseConfig';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/db';
import { teams, players, matches, matchActions } from '../database/schemas';
import { eq, and } from 'drizzle-orm';
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
            // Read pending items from SQLite first (short read-only queries),
            // then do Firestore network calls outside any transaction,
            // then update SQLite sync status in small write transactions.
            await syncService.syncDeleted();
            await syncService.syncTeams();
            await syncService.syncPlayers();
            await syncService.syncMatches();
            await syncService.syncMatchActions();

            // 2. PULL: Get remote changes from Firestore
            await syncService.pullFromFirestore();

            console.log('Sync cycle finished successfully.');
            syncService.notifyListeners();
        } catch (error) {
            console.error('Error during sync cycle:', error);
        }
    },

    // --- PUSH METHODS (Local -> Cloud) ---

    syncDeleted: async () => {
        const collections = [
            { name: 'matchActions', table: matchActions },
            { name: 'matches', table: matches },
            { name: 'players', table: players },
            { name: 'teams', table: teams },
        ];

        for (const { name, table } of collections) {
            const deletedLocal = await db.select().from(table).where(and(eq(table.deleted, true), eq(table.syncStatus, 'pending')));

            for (const item of deletedLocal) {
                try {
                    const docRef = doc(firestoreDb, name, item.id);
                    await deleteDoc(docRef);
                } catch (error: any) {
                    if (error.code !== 'not-found') {
                        console.error(`Failed to delete ${name} ${item.id}:`, error);
                        continue;
                    }
                }
                await db.delete(table).where(eq(table.id, item.id));
                console.log(`Deleted ${name} ${item.id} from cloud and local.`);
            }
        }
    },

    syncTeams: async () => {
        const teamsToSync = await db.select().from(teams).where(and(eq(teams.syncStatus, 'pending'), eq(teams.deleted, false)));
        for (const team of teamsToSync) {
            try {
                const docRef = doc(firestoreDb, 'teams', team.id);
                await setDoc(docRef, toFirestoreDoc(team), { merge: true });
                await db.update(teams).set({ syncStatus: 'synced' }).where(eq(teams.id, team.id));
            } catch (error) {
                console.error(`Failed to sync team ${team.id}:`, error);
            }
        }
    },

    syncPlayers: async () => {
        const playersToSync = await db.select().from(players).where(and(eq(players.syncStatus, 'pending'), eq(players.deleted, false)));
        for (const player of playersToSync) {
            try {
                const docRef = doc(firestoreDb, 'players', player.id);
                await setDoc(docRef, toFirestoreDoc(player), { merge: true });
                await db.update(players).set({ syncStatus: 'synced' }).where(eq(players.id, player.id));
            } catch (error) {
                console.error(`Failed to sync player ${player.id}:`, error);
            }
        }
    },

    syncMatches: async () => {
        const matchesToSync = await db.select().from(matches).where(and(eq(matches.syncStatus, 'pending'), eq(matches.deleted, false)));
        for (const match of matchesToSync) {
            try {
                const docRef = doc(firestoreDb, 'matches', match.id);
                await setDoc(docRef, toFirestoreDoc(match), { merge: true });
                await db.update(matches).set({ syncStatus: 'synced' }).where(eq(matches.id, match.id));
            } catch (error) {
                console.error(`Failed to sync match ${match.id}:`, error);
            }
        }
    },

    syncMatchActions: async () => {
        const actionsToSync = await db.select().from(matchActions).where(and(eq(matchActions.syncStatus, 'pending'), eq(matchActions.deleted, false)));

        for (const action of actionsToSync) {
            try {
                const docRef = doc(firestoreDb, 'matchActions', action.id);
                await setDoc(docRef, toFirestoreDoc(action), { merge: true });
                await db.update(matchActions).set({ syncStatus: 'synced' }).where(eq(matchActions.id, action.id));
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

    syncOnAppStart: () => {
        console.log('Running initial sync on app start.');
        syncService.syncAll();
    },

    _debounceTimer: null as ReturnType<typeof setTimeout> | null,

    triggerSync: () => {
        if (syncService._debounceTimer) {
            clearTimeout(syncService._debounceTimer);
        }
        syncService._debounceTimer = setTimeout(() => {
            syncService._debounceTimer = null;
            syncService.syncAll();
        }, 4000);
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