import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, openDatabaseAsync } from 'expo-sqlite';
import * as schema from './schemas';
import { Platform } from 'react-native';

export const canUseSQLite =
  Platform.OS !== 'web' || typeof SharedArrayBuffer !== 'undefined';

export let db: ExpoSQLiteDatabase<typeof schema> = null as any;

// On web, the SQLite web worker must load its WASM binary before any sync
// operation can succeed. openDatabaseAsync pre-warms the worker first, then
// the sync open reuses the same already-loaded worker instance.
// On native, openDatabaseSync runs synchronously (no WASM involved).
export const dbReady: Promise<void> = canUseSQLite
  ? (async () => {
      if (Platform.OS === 'web') {
        await openDatabaseAsync('scoutvolei.db');
      }
      db = drizzle(openDatabaseSync('scoutvolei.db'), { schema });
    })()
  : new Promise(() => {}); // Never resolves — service worker will reload the page
