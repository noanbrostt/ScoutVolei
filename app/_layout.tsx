import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { useThemeStore } from '../src/store/themeStore';
import { CombinedDefaultTheme, CombinedDarkTheme } from '../src/theme';
import "../global.css";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../src/database/db';
import migrations from '../drizzle/migrations';
import { View, Text } from 'react-native';

export default function RootLayout() {
  const { mode } = useThemeStore();
  
  // Derive theme based on mode (ignoring system for now for simplicity)
  const theme = mode === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme; 

  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Migration Error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading Database...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
