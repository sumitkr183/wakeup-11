import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import type { Tables } from '@/lib/database.types';
import { queryKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;

type SessionContextValue = {
  session: Session | null;
  /** `null` until the user has joined or created a team. */
  profile: Profile | null;
  isLoading: boolean;
  profileError: Error | null;
  retryProfile: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  useEffect(() => {
    // Fires INITIAL_SESSION straight away, then on every sign-in, sign-out and refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsSessionLoaded(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    staleTime: Infinity,
  });

  const value: SessionContextValue = {
    session,
    profile: profileQuery.data ?? null,
    isLoading: !isSessionLoaded || (Boolean(userId) && profileQuery.isPending),
    profileError: profileQuery.error,
    retryProfile: () => void profileQuery.refetch(),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}

/** For screens behind the "has a team" guard, where a profile always exists. */
export function useProfile(): Profile {
  const { profile } = useSession();
  if (!profile) throw new Error('useProfile used on a screen without a profile guard.');
  return profile;
}
