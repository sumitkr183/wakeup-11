import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { registerDeviceForPush } from '@/features/devices/device-registration';
import { logSyncError } from '@/features/wakeups/api';
import { queryKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

import { parseNotificationData, type AlarmNotificationData } from './constants';
import { syncAlarms } from './scheduler';

/**
 * Keeps this phone's alarms in sync with the team schedule and routes alarm
 * notifications to the ringing screen. Mount once, inside the signed-in app.
 */
export function useAlarmEngine(teamId: string): void {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wakeups });
      syncAlarms().catch(logSyncError);
    };

    const handle = (data: AlarmNotificationData | null) => {
      if (data?.type === 'ring') {
        const target = `/ring/${data.wakeupId}`;
        if (pathnameRef.current !== target) {
          router.push({ pathname: '/ring/[id]', params: { id: data.wakeupId } });
        }
      } else if (data?.type === 'sync') {
        refresh();
      }
    };

    refresh();
    registerDeviceForPush().catch((error: unknown) => console.warn('[push] Registration failed', error));

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAlarms().catch(logSyncError);
    });

    const received = Notifications.addNotificationReceivedListener((notification) => {
      handle(parseNotificationData(notification.request.content.data));
    });

    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(parseNotificationData(response.notification.request.content.data));
      void Notifications.clearLastNotificationResponseAsync();
    });

    // A tap that launched the app from a killed state arrives before the listener exists.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handle(parseNotificationData(response.notification.request.content.data));
      void Notifications.clearLastNotificationResponseAsync();
    });

    const pushToken = Notifications.addPushTokenListener(() => {
      registerDeviceForPush().catch((error: unknown) => console.warn('[push] Re-registration failed', error));
    });

    const channel = supabase
      .channel(`team-wakeups:${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wakeups', filter: `team_id=eq.${teamId}` },
        refresh,
      )
      .subscribe();

    return () => {
      appState.remove();
      received.remove();
      tapped.remove();
      pushToken.remove();
      void supabase.removeChannel(channel);
    };
  }, [queryClient, teamId]);
}
