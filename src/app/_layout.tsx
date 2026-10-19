import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { ErrorView } from '@/components/ui/status-view';
import { colors } from '@/constants/theme';
import { configureNotificationHandler } from '@/features/alarm/notifications';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { queryClient } from '@/lib/query-client';

void SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, profile, isLoading, profileError, retryProfile } = useSession();
  // Onboarding signs in mid-submit; keep it mounted while the new profile loads.
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!isLoading && !hasLoaded) setHasLoaded(true);

  useEffect(() => {
    if (hasLoaded) void SplashScreen.hideAsync();
  }, [hasLoaded]);

  if (isLoading && !hasLoaded) return null;
  if (session && profileError && !profile) {
    return <ErrorView error={profileError} onRetry={retryProfile} />;
  }

  const isSignedIn = session !== null;
  const hasTeam = profile !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!hasTeam}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn && hasTeam}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
