// Postgres functions raise short error codes (see supabase/migrations).
// This maps them, and common auth errors, to messages people can act on.
const MESSAGES: Record<string, string> = {
  invalid_invite_code: "That invite code doesn't match any team. Check it with your admin.",
  already_in_team: 'This phone already belongs to a team.',
  invalid_phone: 'Enter a valid phone number, for example +91 98765 43210.',
  admin_cannot_leave: "The admin can't leave the team.",
  invalid_timezone: "Couldn't read your phone's time zone. Try again.",
  admin_only: 'Only the team admin can do that.',
  ring_time_in_past: 'Pick a time at least a minute from now.',
  ring_time_too_far: 'Wake-ups can be scheduled up to 30 days ahead.',
  duplicate_wakeup: 'There is already a wake-up at that time.',
  wakeup_not_cancellable: 'This wake-up has already started or was cancelled.',
  wakeup_not_active: 'This wake-up is not active right now.',
  not_in_team: 'Join a team first.',
};

function extractMessage(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string') return message;
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  const raw = extractMessage(error);
  if (!raw) return 'Something went wrong. Try again.';

  const known = MESSAGES[raw.trim()];
  if (known) return known;

  if (/network request failed|failed to fetch/i.test(raw)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (/anonymous sign-ins are disabled/i.test(raw)) {
    return 'Sign-up is turned off on the server. Ask your admin to enable anonymous sign-ins in Supabase.';
  }
  if (/rate limit/i.test(raw)) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return raw;
}
