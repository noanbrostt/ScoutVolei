import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add-player" />
      <Stack.Screen name="edit-player" />
      <Stack.Screen name="export" />
    </Stack>
  );
}
