-- The admin home lists teammates and updates live as they join with the
-- invite code. Realtime applies the "Members can read teammates" RLS policy,
-- so each subscriber only receives rows from their own team.

alter publication supabase_realtime add table public.profiles;
