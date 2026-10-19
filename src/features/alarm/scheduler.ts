import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';

import {
  ALARM_CHANNEL_ID,
  ALARM_ID_PREFIX,
  RE_RING_OFFSETS_MINUTES,
  TEST_ALARM_ID,
  TEST_WAKEUP_ID,
} from './constants';
import { buildAlarmContent, ensureNotificationChannels } from './notifications';

const MINUTE = 60_000;
/** Don't schedule alarms this close to now; they would fire before scheduling finishes. */
const MIN_LEAD_MS = 2_000;

type PlannedAlarm = {
  wakeupId: string;
  fireAt: number;
  message: string;
};

const alarmId = (wakeupId: string, index: number) => `${ALARM_ID_PREFIX}${wakeupId}:${index}`;
const wakeupPrefix = (wakeupId: string) => `${ALARM_ID_PREFIX}${wakeupId}:`;

async function scheduledAlarmIds(): Promise<string[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests.map((request) => request.identifier).filter((id) => id.startsWith(ALARM_ID_PREFIX));
}

/**
 * Makes the phone's local alarms match the server: schedules missing alarms,
 * cancels ones for wake-ups that were cancelled or already checked in, then
 * reports which wake-ups now have an alarm on this phone.
 */
async function reconcileAlarms(): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await ensureNotificationChannels();

  const { data: wakeups, error } = await supabase.rpc('my_pending_wakeups');
  if (error) throw error;

  const now = Date.now();
  const planned = new Map<string, PlannedAlarm>();
  for (const wakeup of wakeups) {
    const ringAt = Date.parse(wakeup.ring_at);
    RE_RING_OFFSETS_MINUTES.forEach((offset, index) => {
      const fireAt = ringAt + offset * MINUTE;
      if (fireAt > now + MIN_LEAD_MS) {
        planned.set(alarmId(wakeup.id, index), { wakeupId: wakeup.id, fireAt, message: wakeup.message });
      }
    });
  }

  const existing = new Set(await scheduledAlarmIds());

  await Promise.all(
    [...existing]
      .filter((id) => !planned.has(id))
      .map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );

  await Promise.all(
    [...planned]
      .filter(([id]) => !existing.has(id))
      .map(([id, alarm]) =>
        Notifications.scheduleNotificationAsync({
          identifier: id,
          content: buildAlarmContent(alarm.wakeupId, alarm.message),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alarm.fireAt,
            channelId: ALARM_CHANNEL_ID,
          },
        }),
      ),
  );

  const armedWakeupIds = new Set([...planned.values()].map((alarm) => alarm.wakeupId));
  const newlyConfirmed = wakeups
    .filter((wakeup) => wakeup.alarm_set_at === null && armedWakeupIds.has(wakeup.id))
    .map((wakeup) => wakeup.id);

  if (newlyConfirmed.length > 0) {
    const { error: confirmError } = await supabase.rpc('mark_alarm_set', {
      p_wakeup_ids: newlyConfirmed,
    });
    if (confirmError) throw confirmError;
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Safe to call often (app foreground, realtime events, pushes). Runs one at a
 * time so two syncs never schedule the same alarm twice.
 */
export function syncAlarms(): Promise<void> {
  const run = queue.then(reconcileAlarms);
  queue = run.catch(() => undefined);
  return run;
}

/** Stops the remaining re-rings for one wake-up right away, even offline. */
export async function cancelAlarmsForWakeup(wakeupId: string): Promise<void> {
  const prefix = wakeupPrefix(wakeupId);
  const ids = (await scheduledAlarmIds()).filter((id) => id.startsWith(prefix));
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/** Removes alarm banners for a wake-up from the notification tray. */
export async function dismissAlarmNotifications(wakeupId: string): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((notification) => {
        const data = notification.request.content.data as Record<string, unknown> | null;
        return data?.wakeupId === wakeupId;
      })
      .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)),
  );
}

/** Stops a wake-up ringing on this phone: pending re-rings and tray banners. Never throws. */
export async function silenceWakeup(wakeupId: string): Promise<void> {
  try {
    await Promise.all([cancelAlarmsForWakeup(wakeupId), dismissAlarmNotifications(wakeupId)]);
  } catch (error) {
    console.warn('[alarm] Could not silence wake-up', error);
  }
}

/** Used on sign-out: this phone must stop ringing for the old account. */
export async function cancelAllAlarms(): Promise<void> {
  const ids = await scheduledAlarmIds();
  await Promise.all([
    ...ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
    Notifications.cancelScheduledNotificationAsync(TEST_ALARM_ID),
  ]);
}

export async function scheduleTestAlarm(secondsFromNow: number): Promise<void> {
  await ensureNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ALARM_ID,
    content: buildAlarmContent(TEST_WAKEUP_ID, 'This is a test. Tap to open it.'),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: Date.now() + secondsFromNow * 1000,
      channelId: ALARM_CHANNEL_ID,
    },
  });
}
