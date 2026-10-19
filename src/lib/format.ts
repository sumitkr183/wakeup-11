const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** "5:45 AM" in the phone's locale. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today", "Tomorrow", or "Wed, 22 Oct". */
export function formatDay(date: Date, now: Date = new Date()): string {
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Tomorrow, 5:45 AM" */
export function formatDayAndTime(date: Date, now: Date = new Date()): string {
  return `${formatDay(date, now)}, ${formatTime(date)}`;
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MINUTE);
}
