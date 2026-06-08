import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { useThemeStore } from '../src/store/themeStore';
import { CombinedDefaultTheme, CombinedDarkTheme } from '../src/theme';
import "../global.css";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db, dbReady, canUseSQLite } from '../src/database/db';
import migrations from '../drizzle/migrations';
import { View, Text, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import { syncService } from "../src/services/syncService";
import { useFin } from '../src/theme';
import { CircularProgress } from '../src/components/ui';

// Three separate components so hooks are never called conditionally.
export default function RootLayout() {
  if (!canUseSQLite) {
    // Web first load: SharedArrayBuffer not yet available.
    // Register the service worker and wait for the page to reload.
    return <WebCrossOriginInit />;
  }
  return <AppLayout />;
}

// Shown on the first web load before the service worker activates and the page reloads.
// SW registration is handled by the inline script in app/+html.tsx (runs before the bundle).
function WebCrossOriginInit() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Inicializando...</Text>
    </View>
  );
}

function AppLayout() {
  // On web, the SQLite WASM must finish loading before db is usable.
  // On native, db is set synchronously so we can start ready.
  const [dbInitialized, setDbInitialized] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (!dbInitialized) {
      dbReady.then(() => setDbInitialized(true)).catch(console.error);
    }
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return <AppLayoutInner />;
}

function AppLayoutInner() {
  const { mode } = useThemeStore();
  const theme = mode === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

  const { success, error } = useMigrations(db, migrations);

  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  // First launch only: gate the UI behind a progress splash while the initial
  // full pull runs (the one slow sync). Later launches sync in the background.
  const [initialSyncing, setInitialSyncing] = useState(false);
  const [syncFraction, setSyncFraction] = useState(0);

  useEffect(() => {
    if (!(success && fontsLoaded)) return;
    let cancelled = false;
    (async () => {
      const firstRun = !(await syncService.hasSyncedBefore());
      if (firstRun) {
        setInitialSyncing(true);
        await syncService.syncAll(f => { if (!cancelled) setSyncFraction(f); });
        if (!cancelled) setInitialSyncing(false);
      } else {
        syncService.syncOnAppStart();
      }
    })();
    return () => { cancelled = true; };
  }, [success, fontsLoaded]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Migration Error: {error.message}</Text>
      </View>
    );
  }

  if (!success || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar hidden />
      {initialSyncing
        ? <InitialSyncSplash fraction={syncFraction} />
        : <Stack screenOptions={{ headerShown: false }} />}
    </PaperProvider>
  );
}

// One-time branded splash shown during the first full sync after install.
function InitialSyncSplash({ fraction }: { fraction: number }) {
  const fin = useFin();
  return (
    <View style={{ flex: 1, backgroundColor: fin.bg, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 32 }}>
      <Image
        source={require('../assets/icon.jpg')}
        style={{ width: 92, height: 92, borderRadius: 24 }}
        resizeMode="cover"
      />
      <Text style={{ fontWeight: '800', fontSize: 22, color: fin.ink, letterSpacing: -0.4 }}>Blues Voleibol</Text>
      <CircularProgress pct={fraction * 100} fin={fin} />
      <Text style={{ fontSize: 13, color: fin.sub, fontWeight: '600', textAlign: 'center' }}>
        Preparando seus dados pela primeira vez…
      </Text>
    </View>
  );
}
