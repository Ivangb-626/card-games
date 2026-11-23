create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  role text not null default 'player' check (role in ('host', 'player')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  revoked_at timestamptz
);
create table public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);
create table public.room_checkpoints (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  state jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (room_id, round_number, version)
);
create index room_members_user_id_idx on public.room_members(user_id);
create index room_invites_room_id_idx on public.room_invites(room_id);
create index room_events_room_id_id_idx on public.room_events(room_id, id);
create index room_checkpoints_room_id_idx on public.room_checkpoints(room_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_events enable row level security;
alter table public.room_checkpoints enable row level security;
grant select on public.rooms, public.room_members, public.room_events, public.room_checkpoints to authenticated;
revoke all on public.room_invites from anon, authenticated;
revoke insert, update, delete on public.rooms, public.room_members, public.room_events, public.room_checkpoints from anon, authenticated;

create or replace function private.is_room_member(target_room_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.room_members m
  where m.room_id = target_room_id and m.user_id = (select auth.uid())
); $$;
revoke all on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;

create policy "room members can read rooms" on public.rooms for select to authenticated using (private.is_room_member(id));
create policy "room members can read members" on public.room_members for select to authenticated using (private.is_room_member(room_id));
create policy "room members can read events" on public.room_events for select to authenticated using (private.is_room_member(room_id));
create policy "room members can read checkpoints" on public.room_checkpoints for select to authenticated using (private.is_room_member(room_id));

create or replace function public.create_private_room(p_display_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_room_id uuid;
  v_code text;
  v_display_name text := btrim(p_display_name);
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if v_display_name is null or char_length(v_display_name) not between 1 and 30 then
    raise exception 'Name must contain 1 to 30 characters';
  end if;
  insert into public.rooms(created_by) values (v_user_id) returning id into v_room_id;
  insert into public.room_members(room_id, user_id, display_name, role)
    values (v_room_id, v_user_id, v_display_name, 'host');
  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
  insert into public.room_invites(room_id, code, created_by) values (v_room_id, v_code, v_user_id);
  return jsonb_build_object('room_id', v_room_id, 'code', v_code);
end;
$$;

create or replace function public.join_private_room(p_code text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_room_id uuid;
  v_status text;
  v_expires_at timestamptz;
  v_display_name text := btrim(p_display_name);
begin
  if v_user_id is null then raise exception 'Sign in is required'; end if;
  if v_display_name is null or char_length(v_display_name) not between 1 and 30 then
    raise exception 'Name must contain 1 to 30 characters';
  end if;
  select i.room_id into v_room_id from public.room_invites i
  join public.rooms r on r.id = i.room_id
  where i.code = upper(btrim(p_code)) and i.revoked_at is null
    and i.expires_at > now() and r.expires_at > now()
  for update of r;
  if v_room_id is null then raise exception 'Invitation is invalid or expired'; end if;
  select status, expires_at into v_status, v_expires_at from public.rooms where id = v_room_id;
  if v_status <> 'waiting' or v_expires_at <= now() then raise exception 'Room is closed or expired'; end if;
  if not exists (select 1 from public.room_members where room_id = v_room_id and user_id = v_user_id) then
    if (select count(*) from public.room_members where room_id = v_room_id) >= 4 then raise exception 'Room is full'; end if;
    insert into public.room_members(room_id, user_id, display_name) values (v_room_id, v_user_id, v_display_name);
  end if;
  return jsonb_build_object('room_id', v_room_id, 'code', upper(btrim(p_code)));
end;
$$;
revoke all on function public.create_private_room(text) from public, anon;
revoke all on function public.join_private_room(text, text) from public, anon;
grant execute on function public.create_private_room(text) to authenticated;
grant execute on function public.join_private_room(text, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_members') then
    alter publication supabase_realtime add table public.room_members;
  end if;
end;
$$;;
