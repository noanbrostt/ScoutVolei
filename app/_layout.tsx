import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { useThemeStore } from '../src/store/themeStore';
import { CombinedDefaultTheme, CombinedDarkTheme } from '../src/theme';
import "../global.css";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../src/database/db';
import migrations from '../drizzle/migrations';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from "react";
import { syncService } from "../src/services/syncService"; // Import syncService

export default function RootLayout() {
  const { mode } = useThemeStore();
  
  // Derive theme based on mode (ignoring system for now for simplicity)
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
