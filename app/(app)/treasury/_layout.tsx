import { Stack } from 'expo-router';

export default function TreasuryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new-event" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="fee-config" />
      <Stack.Screen name="salary-report" />
      <Stack.Screen name="exemptions" />
    </Stack>
  );
}
