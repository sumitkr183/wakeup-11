// Keep the values shared with the server in sync with private.ring_message()
// in supabase/migrations.

/** Android channel for alarms. Channel settings can't change after creation; rename the ID to change them. */
export const ALARM_CHANNEL_ID = 'wakeup-alarm';
export const UPDATES_CHANNEL_ID = 'wakeup-updates';

/** Bundled by the expo-notifications config plugin (app.json). */
export const ALARM_SOUND = 'alarm.wav';

export const ALARM_TITLE = 'Time to wake up';
export const DEFAULT_ALARM_BODY = 'Team wake-up';

/** Each wake-up rings locally at these offsets until the member checks in. */
export const RE_RING_OFFSETS_MINUTES = [0, 3, 6, 9] as const;

/** A member counts as "needs a call" once this many minutes pass without a check-in. */
export const NEEDS_CALL_AFTER_MINUTES = 10;

export const ALARM_ID_PREFIX = 'wakeup-alarm:';
export const TEST_ALARM_ID = 'test-alarm';
export const TEST_WAKEUP_ID = 'test';

export type AlarmNotificationData = { type: 'ring'; wakeupId: string } | { type: 'sync' };

export function parseNotificationData(data: unknown): AlarmNotificationData | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.type === 'ring' && typeof record.wakeupId === 'string') {
    return { type: 'ring', wakeupId: record.wakeupId };
  }
  if (record.type === 'sync') return { type: 'sync' };
  return null;
}
