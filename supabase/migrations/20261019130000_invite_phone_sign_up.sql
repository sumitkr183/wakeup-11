-- Sign up with an invite code, name and phone number instead of an email code.
--
-- The app signs in anonymously (supabase.auth.signInAnonymously), so the
-- account lives on the phone. Anonymous users still get the `authenticated`
-- role, so the existing grants and RLS policies apply unchanged.

alter table public.profiles
  add column phone text check (phone ~ '^\+?[0-9]{7,15}$');

-- Strips spaces, dashes, dots and brackets. Returns null if it isn't a phone number.
create function private.normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(v, '')
  from (select regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g') as v) s
  where v ~ '^\+?[0-9]{7,15}$'
$$;

drop function public.create_team(text, text, text);
drop function public.join_team(text, text);

create function public.create_team(
  p_team_name text,
  p_display_name text,
  p_phone text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_phone text := private.normalize_phone(p_phone);
  v_team_id uuid;
  v_code text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'already_in_team';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid_timezone';
  end if;

  loop
    v_code := private.generate_invite_code();
    exit when not exists (select 1 from public.teams where invite_code = v_code);
  end loop;

  insert into public.teams (name, invite_code, timezone, created_by)
  values (btrim(p_team_name), v_code, p_timezone, v_user)
  returning id into v_team_id;

  insert into public.profiles (id, team_id, display_name, phone, role)
  values (v_user, v_team_id, btrim(p_display_name), v_phone, 'admin');

  return v_team_id;
end;
$$;

create function public.join_team(p_invite_code text, p_display_name text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_phone text := private.normalize_phone(p_phone);
  v_team_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'already_in_team';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone';
  end if;

  select id into v_team_id
  from public.teams
  where invite_code = upper(btrim(p_invite_code));

  if v_team_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.profiles (id, team_id, display_name, phone, role)
  values (v_user, v_team_id, btrim(p_display_name), v_phone, 'member');

  -- Include the new member in wake-ups that are already scheduled.
  insert into public.wakeup_responses (wakeup_id, user_id, team_id)
  select w.id, v_user, w.team_id
  from public.wakeups w
  where w.team_id = v_team_id
    and w.cancelled_at is null
    and w.ring_at > now();

  return v_team_id;
end;
$$;

-- An anonymous account can't sign back in, so leaving deletes the profile
-- (and, by cascade, its devices and responses) instead of leaving a member
-- who never wakes up. The admin can't leave: the team would have no admin.
create function public.leave_team()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() then
    raise exception 'admin_cannot_leave';
  end if;
  delete from public.profiles where id = auth.uid();
end;
$$;

revoke execute on function private.normalize_phone(text) from public, anon, authenticated;

revoke execute on function
  public.create_team(text, text, text, text),
  public.join_team(text, text, text),
  public.leave_team()
from public, anon;

grant execute on function
  public.create_team(text, text, text, text),
  public.join_team(text, text, text),
  public.leave_team()
to authenticated;
