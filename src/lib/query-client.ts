import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});

// React Query's "window focus" refetching, mapped to the app coming to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}

export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  team: (teamId: string) => ['team', teamId] as const,
  teamMembers: (teamId: string) => ['team', teamId, 'members'] as const,
  wakeups: ['wakeups'] as const,
  pendingWakeups: ['wakeups', 'pending'] as const,
  teamWakeups: ['wakeups', 'team'] as const,
  wakeup: (wakeupId: string) => ['wakeups', 'detail', wakeupId] as const,
  wakeupStatus: (wakeupId: string) => ['wakeups', 'status', wakeupId] as const,
};
