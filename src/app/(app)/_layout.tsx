import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { useAlarmEngine } from '@/features/alarm/use-alarm-engine';
import { useProfile } from '@/features/auth/session-provider';

export default function AppLayout() {
  const profile = useProfile();
  useAlarmEngine(profile.team_id);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ title: 'Alarm setup' }} />
      <Stack.Screen
        name="ring/[id]"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      {/* Every teammate can see who is awake; the screen hides admin-only actions. */}
      <Stack.Screen name="wakeups/[id]" options={{ title: 'Live status' }} />
      <Stack.Protected guard={profile.role === 'admin'}>
        <Stack.Screen name="schedule" options={{ title: 'Schedule wake-up' }} />
      </Stack.Protected>
    </Stack>
  );
}
