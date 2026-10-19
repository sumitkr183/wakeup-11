import { cancelAllAlarms } from '@/features/alarm/scheduler';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

/**
 * There is no email or password: each phone gets an anonymous account the first
 * time it joins or creates a team. Reuses the existing one if a join failed.
 */
export async function ensureSignedIn(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!signIn.user) throw new Error("Couldn't create your account. Try again.");
  return signIn.user.id;
}

/** Anonymous accounts can't sign back in, so leaving removes the member from the team. */
export async function leaveTeam(): Promise<void> {
  // Deleting the profile also deletes this phone's device row, so pushes stop.
  const { error: leaveError } = await supabase.rpc('leave_team');
  if (leaveError) throw leaveError;
  await cancelAllAlarms();
  const { error } = await supabase.auth.signOut();
  queryClient.clear();
  if (error) throw error;
}
