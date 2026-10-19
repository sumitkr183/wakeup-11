import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { supabase } from '@/lib/supabase';

type TableChange = {
  table: string;
  /** PostgREST-style filter, e.g. `team_id=eq.<uuid>`. */
  filter: string;
};

/**
 * Refetches `queryKey` whenever a row matching `change` is inserted, updated
 * or deleted.
 *
 * Each subscriber gets its own channel. `supabase.channel(name)` returns the
 * existing channel when the name is taken, and adding a listener to a channel
 * that is already subscribed throws. Unique names also stop one screen's
 * cleanup from removing a channel another mounted screen still uses.
 */
export function useRealtimeInvalidation(
  queryKey: QueryKey,
  { table, filter }: TableChange,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const queryClient = useQueryClient();
  // useId() is unique per hook call; strip React's delimiters (e.g. «r0») for a plain topic name.
  const subscriberId = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Query keys are new arrays on every render; depend on their content instead.
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;
    const key = JSON.parse(keyHash) as QueryKey;
    const channel = supabase
      .channel(`${table}:${subscriberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => {
        void queryClient.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [enabled, filter, keyHash, queryClient, subscriberId, table]);
}
