-- Wakeup 11 — initial schema.
--
-- Design notes
-- * Clients only READ tables (through RLS). Every write goes through a
--   SECURITY DEFINER function below, which validates the caller's role.
-- * Phones schedule real local alarms. The server only sends backup pushes:
--   at ring time for phones that never confirmed their alarm, and as an
--   escalation for anyone still asleep after the local re-rings run out.
-- * Pushes go straight from Postgres to the Expo Push API through pg_net,
--   so the project needs no edge functions.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.team_role as enum ('admin', 'member');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  invite_code text not null unique,
  timezone text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role public.team_role not null default 'member',
  created_at timestamptz not null default now()
);
create index profiles_team_id_idx on public.profiles (team_id);

-- One row per app installation. The app generates installation_id on first
-- launch, so a phone that changes accounts reuses its row.
create table public.devices (
  installation_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  push_token text unique check (push_token ~ '^Expo(nent)?PushToken\[.+\]$'),
  updated_at timestamptz not null default now()
);
create index devices_user_id_idx on public.devices (user_id);

create table public.wakeups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  ring_at timestamptz not null,
  message text not null default '' check (char_length(message) <= 140),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index wakeups_team_ring_at_idx on public.wakeups (team_id, ring_at);
create unique index wakeups_team_ring_at_active_key
  on public.wakeups (team_id, ring_at) where cancelled_at is null;

-- One row per (wakeup, member). Created automatically for every team member.
create table public.wakeup_responses (
  wakeup_id uuid not null references public.wakeups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  alarm_set_at timestamptz,
  awake_at timestamptz,
  push_count integer not null default 0,
  last_push_at timestamptz,
  primary key (wakeup_id, user_id)
);
create index wakeup_responses_user_id_idx on public.wakeup_responses (user_id);
create index wakeup_responses_team_id_idx on public.wakeup_responses (team_id);

-- ---------------------------------------------------------------------------
-- Helpers (private schema: not exposed through the Data API)
-- ---------------------------------------------------------------------------

create function private.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

create function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- No 0/O or 1/I, so codes are easy to read out loud.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_code text := '';
begin
  for i in 0..5 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_code;
end;
$$;

-- Builds one Expo push message for an alarm. Kept in sync with the local
-- alarm content in src/features/alarm/constants.ts.
create function private.ring_message(p_wakeup_id uuid, p_push_token text, p_message text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'to', p_push_token,
    'title', 'Time to wake up',
    'body', coalesce(nullif(p_message, ''), 'Team wake-up'),
    'sound', 'alarm.wav',
    'channelId', 'wakeup-alarm',
    'priority', 'high',
    'interruptionLevel', 'time-sensitive',
    'ttl', 1800,
    'data', jsonb_build_object('type', 'ring', 'wakeupId', p_wakeup_id)
  )
$$;

-- Sends a JSON array of Expo push messages in batches of 100 (the Expo limit).
-- pg_net only sends after the surrounding transaction commits.
create function private.send_push(p_messages jsonb)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_total integer := coalesce(jsonb_array_length(p_messages), 0);
  v_offset integer := 0;
begin
  while v_offset < v_total loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (
        select jsonb_agg(m.message order by m.idx)
        from jsonb_array_elements(p_messages) with ordinality as m(message, idx)
        where m.idx > v_offset and m.idx <= v_offset + 100
      ),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    v_offset := v_offset + 100;
  end loop;
end;
$$;

-- Visible push telling teammates to open the app so it can sync its alarms.
create function private.send_sync_push(p_team_id uuid, p_exclude_user uuid, p_title text, p_body text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform private.send_push((
    select coalesce(jsonb_agg(jsonb_build_object(
      'to', d.push_token,
      'title', p_title,
      'body', p_body,
      'sound', 'default',
      'channelId', 'wakeup-updates',
      'priority', 'high',
      'data', jsonb_build_object('type', 'sync')
    )), '[]'::jsonb)
    from public.devices d
    join public.profiles p on p.id = d.user_id
    where p.team_id = p_team_id
      and d.push_token is not null
      and d.user_id is distinct from p_exclude_user
  ));
end;
$$;

create function private.format_ring_time(p_ring_at timestamptz, p_team_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_ring_at at time zone t.timezone, 'FMHH12:MI AM, Dy FMDD Mon')
  from public.teams t
  where t.id = p_team_id
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.on_wakeup_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wakeup_responses (wakeup_id, user_id, team_id)
  select new.id, p.id, new.team_id
  from public.profiles p
  where p.team_id = new.team_id;

  perform private.send_sync_push(
    new.team_id,
    new.created_by,
    'New wake-up scheduled',
    'Open the app to set your alarm for ' || private.format_ring_time(new.ring_at, new.team_id)
  );
  return null;
end;
$$;

create trigger wakeup_created
after insert on public.wakeups
for each row execute function private.on_wakeup_created();

create function private.on_wakeup_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.send_sync_push(
    new.team_id,
    null,
    'Wake-up cancelled',
    'The ' || private.format_ring_time(new.ring_at, new.team_id)
      || ' wake-up was cancelled. Open the app to remove the alarm.'
  );
  return null;
end;
$$;

create trigger wakeup_cancelled
after update of cancelled_at on public.wakeups
for each row
when (old.cancelled_at is null and new.cancelled_at is not null)
execute function private.on_wakeup_cancelled();

-- ---------------------------------------------------------------------------
-- Row level security: read-only access to your own team.
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.wakeups enable row level security;
alter table public.wakeup_responses enable row level security;

revoke all on public.teams, public.profiles, public.devices, public.wakeups, public.wakeup_responses
  from anon, authenticated;
grant select on public.teams, public.profiles, public.wakeups, public.wakeup_responses
  to authenticated;

create policy "Members can read their team"
  on public.teams for select to authenticated
  using (id = (select private.my_team_id()));

create policy "Members can read teammates"
  on public.profiles for select to authenticated
  using (team_id = (select private.my_team_id()));

create policy "Members can read team wake-ups"
  on public.wakeups for select to authenticated
  using (team_id = (select private.my_team_id()));

create policy "Members can read team responses"
  on public.wakeup_responses for select to authenticated
  using (team_id = (select private.my_team_id()));

-- devices: RLS on with no policies, so only the definer functions can touch it.

-- ---------------------------------------------------------------------------
-- RPCs: onboarding
-- ---------------------------------------------------------------------------

create function public.create_team(p_team_name text, p_display_name text, p_timezone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team_id uuid;
  v_code text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'already_in_team';
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

  insert into public.profiles (id, team_id, display_name, role)
  values (v_user, v_team_id, btrim(p_display_name), 'admin');

  return v_team_id;
end;
$$;

create function public.join_team(p_invite_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'already_in_team';
  end if;

  select id into v_team_id
  from public.teams
  where invite_code = upper(btrim(p_invite_code));

  if v_team_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.profiles (id, team_id, display_name, role)
  values (v_user, v_team_id, btrim(p_display_name), 'member');

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

-- ---------------------------------------------------------------------------
-- RPCs: devices
-- ---------------------------------------------------------------------------

create function public.register_device(p_installation_id uuid, p_platform text, p_push_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'not_in_team' using errcode = '42501';
  end if;

  -- A push token belongs to one installation. Drop stale copies (e.g. a reinstall).
  delete from public.devices
  where push_token = p_push_token and installation_id <> p_installation_id;

  insert into public.devices (installation_id, user_id, platform, push_token, updated_at)
  values (p_installation_id, v_user, p_platform, p_push_token, now())
  on conflict (installation_id) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        push_token = excluded.push_token,
        updated_at = excluded.updated_at;
end;
$$;

create function public.unregister_device(p_installation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.devices
  where installation_id = p_installation_id and user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- RPCs: wake-ups (admin)
-- ---------------------------------------------------------------------------

create function public.schedule_wakeup(p_ring_at timestamptz, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid := private.my_team_id();
  v_wakeup_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if p_ring_at < now() + interval '1 minute' then
    raise exception 'ring_time_in_past';
  end if;
  if p_ring_at > now() + interval '30 days' then
    raise exception 'ring_time_too_far';
  end if;
  if exists (
    select 1 from public.wakeups
    where team_id = v_team_id and ring_at = p_ring_at and cancelled_at is null
  ) then
    raise exception 'duplicate_wakeup';
  end if;

  insert into public.wakeups (team_id, ring_at, message, created_by)
  values (v_team_id, p_ring_at, btrim(coalesce(p_message, '')), auth.uid())
  returning id into v_wakeup_id;

  return v_wakeup_id;
end;
$$;

create function public.cancel_wakeup(p_wakeup_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  update public.wakeups
  set cancelled_at = now()
  where id = p_wakeup_id
    and team_id = private.my_team_id()
    and cancelled_at is null
    and ring_at > now();

  if not found then
    raise exception 'wakeup_not_cancellable';
  end if;
end;
$$;

-- Sends a ring push right now to everyone who has not checked in.
-- Returns how many members were still asleep.
create function public.ring_again(p_wakeup_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asleep integer;
  v_messages jsonb;
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.wakeups
    where id = p_wakeup_id
      and team_id = private.my_team_id()
      and cancelled_at is null
      and ring_at <= now()
  ) then
    raise exception 'wakeup_not_active';
  end if;

  with asleep as (
    update public.wakeup_responses wr
    set last_push_at = now()
    where wr.wakeup_id = p_wakeup_id and wr.awake_at is null
    returning wr.user_id
  )
  select
    (select count(*) from asleep)::integer,
    coalesce(jsonb_agg(private.ring_message(w.id, d.push_token, w.message)), '[]'::jsonb)
  into v_asleep, v_messages
  from asleep a
  join public.devices d on d.user_id = a.user_id and d.push_token is not null
  join public.wakeups w on w.id = p_wakeup_id;

  perform private.send_push(v_messages);
  return coalesce(v_asleep, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: wake-ups (every member)
-- ---------------------------------------------------------------------------

-- The phone calls this after it has scheduled local alarms.
create function public.mark_alarm_set(p_wakeup_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.wakeup_responses
  set alarm_set_at = coalesce(alarm_set_at, now())
  where user_id = auth.uid() and wakeup_id = any (p_wakeup_ids)
$$;

create function public.mark_awake(p_wakeup_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_awake_at timestamptz;
begin
  update public.wakeup_responses wr
  set awake_at = coalesce(wr.awake_at, now())
  from public.wakeups w
  where wr.wakeup_id = p_wakeup_id
    and wr.user_id = auth.uid()
    and w.id = wr.wakeup_id
    and w.cancelled_at is null
    and now() >= w.ring_at - interval '30 minutes'
  returning wr.awake_at into v_awake_at;

  if v_awake_at is null then
    raise exception 'wakeup_not_active';
  end if;
  return v_awake_at;
end;
$$;

-- Read helpers. SECURITY INVOKER, so the RLS policies above still apply.

create function public.my_pending_wakeups()
returns table (id uuid, ring_at timestamptz, message text, alarm_set_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select w.id, w.ring_at, w.message, wr.alarm_set_at
  from public.wakeup_responses wr
  join public.wakeups w on w.id = wr.wakeup_id
  where wr.user_id = auth.uid()
    and wr.awake_at is null
    and w.cancelled_at is null
    and w.ring_at > now() - interval '30 minutes'
  order by w.ring_at
  limit 10
$$;

create function public.team_wakeups()
returns table (
  id uuid,
  ring_at timestamptz,
  message text,
  member_count integer,
  alarm_set_count integer,
  awake_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    w.id,
    w.ring_at,
    w.message,
    count(wr.user_id)::integer,
    count(wr.alarm_set_at)::integer,
    count(wr.awake_at)::integer
  from public.wakeups w
  left join public.wakeup_responses wr on wr.wakeup_id = w.id
  where w.cancelled_at is null
    and w.ring_at > now() - interval '12 hours'
  group by w.id
  order by w.ring_at
  limit 20
$$;

create function public.wakeup_status(p_wakeup_id uuid)
returns table (
  user_id uuid,
  display_name text,
  alarm_set_at timestamptz,
  awake_at timestamptz,
  push_count integer,
  last_push_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.display_name, wr.alarm_set_at, wr.awake_at, wr.push_count, wr.last_push_at
  from public.wakeup_responses wr
  join public.profiles p on p.id = wr.user_id
  where wr.wakeup_id = p_wakeup_id
  order by wr.awake_at nulls first, p.display_name
$$;

-- ---------------------------------------------------------------------------
-- Backup pushes, every minute.
--
-- Local alarms ring at T, T+3, T+6 and T+9 minutes. The server pushes:
--   * from T, to phones that never confirmed a local alarm;
--   * from T+12, to everyone still asleep (after local re-rings ran out).
-- At most 4 server pushes per member, 3 minutes apart, until T+30.
-- ---------------------------------------------------------------------------

create function private.dispatch_due_rings()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_messages jsonb;
begin
  with due as (
    update public.wakeup_responses wr
    set push_count = wr.push_count + 1,
        last_push_at = now()
    from public.wakeups w
    where w.id = wr.wakeup_id
      and w.cancelled_at is null
      and wr.awake_at is null
      and wr.push_count < 4
      and now() >= w.ring_at + case
        when wr.alarm_set_at is null then interval '0 minutes'
        else interval '12 minutes'
      end
      and now() < w.ring_at + interval '30 minutes'
      and (wr.last_push_at is null or wr.last_push_at <= now() - interval '170 seconds')
    returning wr.wakeup_id, wr.user_id
  )
  select coalesce(jsonb_agg(private.ring_message(w.id, d.push_token, w.message)), '[]'::jsonb)
  into v_messages
  from due
  join public.devices d on d.user_id = due.user_id and d.push_token is not null
  join public.wakeups w on w.id = due.wakeup_id;

  perform private.send_push(v_messages);
end;
$$;

select cron.schedule('dispatch-due-rings', '* * * * *', $$select private.dispatch_due_rings()$$);

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
-- RLS policies call these as the signed-in user.
grant execute on function private.my_team_id() to authenticated;
grant execute on function private.is_admin() to authenticated;

revoke execute on function
  public.create_team(text, text, text),
  public.join_team(text, text),
  public.register_device(uuid, text, text),
  public.unregister_device(uuid),
  public.schedule_wakeup(timestamptz, text),
  public.cancel_wakeup(uuid),
  public.ring_again(uuid),
  public.mark_alarm_set(uuid[]),
  public.mark_awake(uuid),
  public.my_pending_wakeups(),
  public.team_wakeups(),
  public.wakeup_status(uuid)
from public, anon;

grant execute on function
  public.create_team(text, text, text),
  public.join_team(text, text),
  public.register_device(uuid, text, text),
  public.unregister_device(uuid),
  public.schedule_wakeup(timestamptz, text),
  public.cancel_wakeup(uuid),
  public.ring_again(uuid),
  public.mark_alarm_set(uuid[]),
  public.mark_awake(uuid),
  public.my_pending_wakeups(),
  public.team_wakeups(),
  public.wakeup_status(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: live status screen listens for check-ins.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.wakeups, public.wakeup_responses;
