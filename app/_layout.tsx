import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { useThemeStore } from '../src/store/themeStore';
import { CombinedDefaultTheme, CombinedDarkTheme } from '../src/theme';
import "../global.css";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db, dbReady, canUseSQLite } from '../src/database/db';
import migrations from '../drizzle/migrations';
import { View, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import { syncService } from "../src/services/syncService";

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

  useEffect(() => {
    if (success && fontsLoaded) {
      syncService.startPeriodicSync();
    }
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
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
