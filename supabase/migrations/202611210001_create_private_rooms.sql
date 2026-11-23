create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'expired')),
  host_member_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  auth_user_id uuid not null default auth.uid(),
  identity_id text not null,
  display_name text not null,
  seat integer not null check (seat between 0 and 3),
  is_host boolean not null default false,
  connection_status text not null default 'connected'
    check (connection_status in ('connected', 'reconnecting', 'absent', 'paused')),
  joined_at timestamptz not null default now(),
  unique (room_id, identity_id),
  unique (room_id, seat)
);

alter table public.rooms
  add constraint rooms_host_member_fkey
  foreign key (host_member_id) references public.room_members(id) on delete set null;

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  code text not null references public.rooms(code) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  member_id uuid references public.room_members(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  version bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_checkpoints (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.room_payload(p_room_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'code', r.code,
    'hostMemberId', r.host_member_id,
    'status', r.status,
    'expiresAt', r.expires_at,
    'members', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'identityId', m.identity_id,
            'name', m.display_name,
            'isHost', m.is_host,
            'connection', m.connection_status,
            'seat', m.seat
          )
          order by m.seat
        )
        from public.room_members m
        where m.room_id = r.id
      ),
      '[]'::jsonb
    )
  )
  from public.rooms r
  where r.id = p_room_id;
$$;

create or replace function public.create_private_room(p_identity_id text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_member public.room_members;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'guest_session_required';
  end if;
  if length(trim(p_display_name)) = 0 then
    raise exception 'name_empty';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.rooms(code, expires_at)
      values (v_code, now() + interval '30 minutes')
      returning * into v_room;
      exit;
    exception when unique_violation then
    end;
  end loop;

  insert into public.room_members(room_id, auth_user_id, identity_id, display_name, seat, is_host)
  values (v_room.id, auth.uid(), p_identity_id, trim(p_display_name), 0, true)
  returning * into v_member;

  update public.rooms
  set host_member_id = v_member.id,
      updated_at = now()
  where id = v_room.id;

  insert into public.room_invites(room_id, code, expires_at)
  values (v_room.id, v_room.code, now() + interval '24 hours');

  insert into public.room_events(room_id, member_id, event_type, event_data, version)
  values (v_room.id, v_member.id, 'room_created', '{}'::jsonb, 1);

  return public.room_payload(v_room.id);
end;
$$;

create or replace function public.join_private_room(p_code text, p_identity_id text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_member public.room_members;
  v_seat integer;
begin
  if auth.uid() is null then
    raise exception 'guest_session_required';
  end if;
  if length(trim(p_display_name)) = 0 then
    raise exception 'name_empty';
  end if;

  select r.* into v_room
  from public.rooms r
  join public.room_invites i on i.room_id = r.id
  where r.code = upper(trim(p_code))
    and r.status in ('waiting', 'playing')
    and r.expires_at > now()
    and i.expires_at > now()
  limit 1;

  if v_room.id is null then
    raise exception 'room_not_found';
  end if;

  select m.* into v_member
  from public.room_members m
  where m.room_id = v_room.id
    and m.identity_id = p_identity_id;

  if v_member.id is not null then
    update public.room_members
    set display_name = trim(p_display_name),
        connection_status = 'connected',
        auth_user_id = auth.uid()
    where id = v_member.id;
    return public.room_payload(v_room.id);
  end if;

  select count(*) into v_seat
  from public.room_members
  where room_id = v_room.id;
  if v_seat >= 4 then
    raise exception 'room_full';
  end if;

  if exists (
    select 1
    from public.room_members
    where room_id = v_room.id
      and lower(display_name) = lower(trim(p_display_name))
  ) then
    raise exception 'name_duplicate';
  end if;

  insert into public.room_members(room_id, auth_user_id, identity_id, display_name, seat)
  values (v_room.id, auth.uid(), p_identity_id, trim(p_display_name), v_seat);

  insert into public.room_events(room_id, member_id, event_type, event_data, version)
  select v_room.id, m.id, 'player_joined', '{}'::jsonb,
         coalesce(max(e.version), 0) + 1
  from public.room_members m
  left join public.room_events e on e.room_id = v_room.id
  where m.room_id = v_room.id and m.identity_id = p_identity_id
  group by m.id;

  return public.room_payload(v_room.id);
end;
$$;

revoke all on function public.create_private_room(text, text) from public;
grant execute on function public.create_private_room(text, text) to anon, authenticated;
revoke all on function public.join_private_room(text, text, text) from public;
grant execute on function public.join_private_room(text, text, text) to anon, authenticated;
revoke all on function public.room_payload(uuid) from public;
grant execute on function public.room_payload(uuid) to anon, authenticated;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_events enable row level security;
alter table public.room_checkpoints enable row level security;

create policy rooms_member_select on public.rooms
  for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.room_id = rooms.id and m.auth_user_id = auth.uid()
  ));

create policy room_members_member_select on public.room_members
  for select to authenticated
  using (exists (
    select 1 from public.room_members own
    where own.room_id = room_members.room_id and own.auth_user_id = auth.uid()
  ));

create policy room_events_member_select on public.room_events
  for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.room_id = room_events.room_id and m.auth_user_id = auth.uid()
  ));

create policy room_checkpoints_member_select on public.room_checkpoints
  for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.room_id = room_checkpoints.room_id and m.auth_user_id = auth.uid()
  ));
