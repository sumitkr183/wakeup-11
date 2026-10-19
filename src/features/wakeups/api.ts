import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { silenceWakeup, syncAlarms } from '@/features/alarm/scheduler';
import type { RpcReturns, Tables } from '@/lib/database.types';
import { queryKeys } from '@/lib/query-client';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

export type Wakeup = Tables<'wakeups'>;
export type PendingWakeup = RpcReturns<'my_pending_wakeups'>[number];
export type TeamWakeup = RpcReturns<'team_wakeups'>[number];
export type MemberStatus = RpcReturns<'wakeup_status'>[number];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** This member's wake-ups that still need a check-in, soonest first. */
export function usePendingWakeups() {
  return useQuery({
    queryKey: queryKeys.pendingWakeups,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_pending_wakeups');
      if (error) throw error;
      return data;
    },
  });
}

/** Upcoming and recent team wake-ups with progress counts. */
export function useTeamWakeups() {
  return useQuery({
    queryKey: queryKeys.teamWakeups,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('team_wakeups');
      if (error) throw error;
      return data;
    },
  });
}

export function useWakeup(wakeupId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.wakeup(wakeupId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wakeups')
        .select('*')
        .eq('id', wakeupId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: options.enabled ?? true,
  });
}

/** Per-member status for one wake-up, kept live through realtime. */
export function useWakeupStatus(wakeupId: string) {
  useRealtimeInvalidation(queryKeys.wakeupStatus(wakeupId), {
    table: 'wakeup_responses',
    filter: `wakeup_id=eq.${wakeupId}`,
  });

  return useQuery({
    queryKey: queryKeys.wakeupStatus(wakeupId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('wakeup_status', { p_wakeup_id: wakeupId });
      if (error) throw error;
      return data;
    },
    // Safety net in case a realtime event is missed.
    refetchInterval: 20_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useScheduleWakeup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ringAt: Date; message: string }) => {
      const { data, error } = await supabase.rpc('schedule_wakeup', {
        p_ring_at: input.ringAt.toISOString(),
        p_message: input.message,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wakeups });
      // The admin gets the alarm too.
      void syncAlarms().catch(logSyncError);
    },
  });
}

export function useCancelWakeup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wakeupId: string) => {
      const { error } = await supabase.rpc('cancel_wakeup', { p_wakeup_id: wakeupId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wakeups });
      void syncAlarms().catch(logSyncError);
    },
  });
}

export function useRingAgain() {
  return useMutation({
    mutationFn: async (wakeupId: string) => {
      const { data, error } = await supabase.rpc('ring_again', { p_wakeup_id: wakeupId });
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkAwake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wakeupId: string) => {
      const { data, error } = await supabase.rpc('mark_awake', { p_wakeup_id: wakeupId });
      if (error) throw error;
      return new Date(data);
    },
    // Check-in matters most when the network is flaky first thing in the morning.
    retry: 3,
    onSuccess: async (_awakeAt, wakeupId) => {
      await silenceWakeup(wakeupId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.wakeups });
      void syncAlarms().catch(logSyncError);
    },
  });
}

export function logSyncError(error: unknown): void {
  console.warn('[alarm] Sync failed', error);
}
