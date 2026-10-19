// Mirrors supabase/migrations. After changing the schema, regenerate with:
//   npx supabase gen types typescript --linked > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TeamRole = 'admin' | 'member';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          timezone: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          team_id: string;
          display_name: string;
          phone: string | null;
          role: TeamRole;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'profiles_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      wakeups: {
        Row: {
          id: string;
          team_id: string;
          ring_at: string;
          message: string;
          created_by: string | null;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      wakeup_responses: {
        Row: {
          wakeup_id: string;
          user_id: string;
          team_id: string;
          alarm_set_at: string | null;
          awake_at: string | null;
          push_count: number;
          last_push_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_team: {
        Args: { p_team_name: string; p_display_name: string; p_phone: string; p_timezone: string };
        Returns: string;
      };
      join_team: {
        Args: { p_invite_code: string; p_display_name: string; p_phone: string };
        Returns: string;
      };
      leave_team: {
        Args: never;
        Returns: undefined;
      };
      register_device: {
        Args: { p_installation_id: string; p_platform: string; p_push_token: string };
        Returns: undefined;
      };
      unregister_device: {
        Args: { p_installation_id: string };
        Returns: undefined;
      };
      schedule_wakeup: {
        Args: { p_ring_at: string; p_message: string };
        Returns: string;
      };
      cancel_wakeup: {
        Args: { p_wakeup_id: string };
        Returns: undefined;
      };
      ring_again: {
        Args: { p_wakeup_id: string };
        Returns: number;
      };
      mark_alarm_set: {
        Args: { p_wakeup_ids: string[] };
        Returns: undefined;
      };
      mark_awake: {
        Args: { p_wakeup_id: string };
        Returns: string;
      };
      my_pending_wakeups: {
        Args: never;
        Returns: {
          id: string;
          ring_at: string;
          message: string;
          alarm_set_at: string | null;
        }[];
      };
      team_wakeups: {
        Args: never;
        Returns: {
          id: string;
          ring_at: string;
          message: string;
          member_count: number;
          alarm_set_count: number;
          awake_count: number;
        }[];
      };
      wakeup_status: {
        Args: { p_wakeup_id: string };
        Returns: {
          user_id: string;
          display_name: string;
          alarm_set_at: string | null;
          awake_at: string | null;
          push_count: number;
          last_push_at: string | null;
        }[];
      };
    };
    Enums: {
      team_role: TeamRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type RpcReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns'];
