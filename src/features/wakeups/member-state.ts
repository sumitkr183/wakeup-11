import { NEEDS_CALL_AFTER_MINUTES, RE_RING_OFFSETS_MINUTES } from '@/features/alarm/constants';
import { formatTime, minutesBetween } from '@/lib/format';

import type { MemberStatus } from './api';

const MINUTE = 60_000;
const RE_RING_INTERVAL_MINUTES = RE_RING_OFFSETS_MINUTES[1] - RE_RING_OFFSETS_MINUTES[0];

export type MemberState = {
  /** Before ring time: alarm set on their phone. After: checked in. */
  isDone: boolean;
  /** Status line, e.g. "Rang 2× · next ring 5:54". */
  detail: string;
  tone: 'muted' | 'success' | 'accent';
  /** The admin should phone this person. */
  needsCall: boolean;
};

export function getMemberState(member: MemberStatus, ringAt: Date, now: Date): MemberState {
  if (ringAt > now) {
    return member.alarm_set_at
      ? { isDone: true, detail: 'Alarm set on their phone', tone: 'success', needsCall: false }
      : { isDone: false, detail: 'Alarm not set yet · ask them to open the app', tone: 'accent', needsCall: true };
  }

  if (member.awake_at) {
    return {
      isDone: true,
      detail: `Awake · ${formatTime(new Date(member.awake_at))}`,
      tone: 'success',
      needsCall: false,
    };
  }

  if (!member.alarm_set_at) {
    return { isDone: false, detail: 'No alarm on phone · call', tone: 'accent', needsCall: true };
  }

  // The phone's own re-rings that are due by now, plus backup pushes from the
  // server. An estimate: the phone doesn't report each ring it plays.
  const elapsed = minutesBetween(ringAt, now);
  const rings = RE_RING_OFFSETS_MINUTES.filter((offset) => offset <= elapsed).length + member.push_count;
  const rang = `Rang ${rings}×`;

  if (elapsed >= NEEDS_CALL_AFTER_MINUTES) {
    return { isDone: false, detail: `${rang} · needs a call`, tone: 'accent', needsCall: true };
  }

  const nextOffset = RE_RING_OFFSETS_MINUTES.find((offset) => offset > elapsed);
  const detail =
    nextOffset === undefined
      ? rang
      : `${rang} · next ring ${formatTime(new Date(ringAt.getTime() + nextOffset * MINUTE))}`;
  return { isDone: false, detail, tone: 'muted', needsCall: false };
}

/** One-line summary under the progress ring on the live status screen. */
export function getProgressCaption({
  ringAt,
  now,
  pendingCount,
  needsCallCount,
}: {
  ringAt: Date;
  now: Date;
  pendingCount: number;
  needsCallCount: number;
}): string {
  if (ringAt > now) return `Rings at ${formatTime(ringAt)}`;
  if (pendingCount === 0) return 'Everyone is up';
  if (minutesBetween(ringAt, now) < NEEDS_CALL_AFTER_MINUTES) return `Re-ringing every ${RE_RING_INTERVAL_MINUTES} min`;
  return `${needsCallCount} ${needsCallCount === 1 ? 'needs' : 'need'} a call`;
}

/** 1-based check-in position of `userId`, or null if they haven't checked in. */
export function getWakeRank(statuses: MemberStatus[], userId: string): number | null {
  const mine = statuses.find((member) => member.user_id === userId)?.awake_at;
  if (!mine) return null;
  const myTime = new Date(mine).getTime();
  return statuses.filter((member) => member.awake_at !== null && new Date(member.awake_at).getTime() <= myTime)
    .length;
}
