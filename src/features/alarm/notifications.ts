import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ALARM_CHANNEL_ID,
  ALARM_SOUND,
  ALARM_TITLE,
  DEFAULT_ALARM_BODY,
  UPDATES_CHANNEL_ID,
} from './constants';

export type AlarmPermission = 'granted' | 'undetermined' | 'denied';

/** Call once at startup, before any notification can arrive. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldSetBadge: false,
    }),
  });
}

let channelsReady: Promise<void> | null = null;

/**
 * Android only. The alarm channel plays on the ALARM audio stream, so it rings
 * even when the phone is on silent or vibrate.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();

  channelsReady ??= (async () => {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Wake-up alarms',
      description: 'Rings for team wake-ups, even on silent.',
      importance: Notifications.AndroidImportance.MAX,
      sound: ALARM_SOUND,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      bypassDnd: true,
      enableVibrate: true,
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(UPDATES_CHANNEL_ID, {
      name: 'Schedule updates',
      description: 'New or cancelled wake-ups.',
      importance: Notifications.AndroidImportance.HIGH,
    });
  })().catch((error: unknown) => {
    channelsReady = null; // allow a retry next time
    throw error;
  });

  return channelsReady;
}

function toAlarmPermission(response: Notifications.NotificationPermissionsStatus): AlarmPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function getAlarmPermission(): Promise<AlarmPermission> {
  return toAlarmPermission(await Notifications.getPermissionsAsync());
}

export async function requestAlarmPermission(): Promise<AlarmPermission> {
  // Android 13+ only shows the prompt once a channel exists.
  await ensureNotificationChannels();
  const response = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return toAlarmPermission(response);
}

export function buildAlarmContent(wakeupId: string, message: string): Notifications.NotificationContentInput {
  return {
    title: ALARM_TITLE,
    body: message.trim() || DEFAULT_ALARM_BODY,
    sound: ALARM_SOUND,
    // Breaks through Focus on iOS (needs the time-sensitive entitlement in app.json).
    interruptionLevel: 'timeSensitive',
    priority: Notifications.AndroidNotificationPriority.MAX,
    data: { type: 'ring', wakeupId },
  };
}
