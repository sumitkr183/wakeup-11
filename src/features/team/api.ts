import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureSignedIn } from '@/features/auth/api';
import type { Tables } from '@/lib/database.types';
import { queryKeys } from '@/lib/query-client';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

export type TeamMember = Pick<Tables<'profiles'>, 'id' | 'display_name' | 'phone' | 'role'>;

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: queryKeys.team(teamId),
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

/**
 * Everyone on the team, admin first, then by name. New joiners appear live
 * through realtime; leavers show up on the next refetch, because realtime
 * can't filter DELETE events by team.
 */
export function useTeamMembers(teamId: string, { enabled = true }: { enabled?: boolean } = {}) {
  useRealtimeInvalidation(
    queryKeys.teamMembers(teamId),
    { table: 'profiles', filter: `team_id=eq.${teamId}` },
    { enabled },
  );

  return useQuery({
    enabled,
    queryKey: queryKeys.teamMembers(teamId),
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, phone, role')
        .eq('team_id', teamId)
        // team_role is an enum declared as ('admin', 'member'), so admin sorts first.
        .order('role')
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

type CreateTeamInput = { teamName: string; displayName: string; phone: string };
type JoinTeamInput = { inviteCode: string; displayName: string; phone: string };

/**
 * Signs the phone in anonymously, then creates or joins a team. On success the
 * session guard moves the user into the app.
 */
export function useOnboarding() {
  const queryClient = useQueryClient();
  const onSuccess = (userId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });

  const createTeam = useMutation({
    mutationFn: async ({ teamName, displayName, phone }: CreateTeamInput) => {
      const userId = await ensureSignedIn();
      const { error } = await supabase.rpc('create_team', {
        p_team_name: teamName,
        p_display_name: displayName,
        p_phone: phone,
        p_timezone: deviceTimeZone(),
      });
      if (error) throw error;
      return userId;
    },
    onSuccess,
  });

  const joinTeam = useMutation({
    mutationFn: async ({ inviteCode, displayName, phone }: JoinTeamInput) => {
      const userId = await ensureSignedIn();
      const { error } = await supabase.rpc('join_team', {
        p_invite_code: inviteCode,
        p_display_name: displayName,
        p_phone: phone,
      });
      if (error) throw error;
      return userId;
    },
    onSuccess,
  });

  return { createTeam, joinTeam };
}
