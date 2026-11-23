-- Partida de Chinchón digital.
-- room_games guarda el estado completo (mazo y manos) y solo lo usa la Edge Function con service_role.
-- room_game_public es la vista común de la mesa; room_game_hands, la mano de cada jugador, legible solo por su dueño.

create table if not exists public.room_games (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state jsonb not null,
  version bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.room_game_public (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  view jsonb not null,
  version bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.room_game_hands (
  room_id uuid not null references public.rooms(id) on delete cascade,
  member_id uuid not null references public.room_members(id) on delete cascade,
  cards jsonb not null default '[]'::jsonb,
  version bigint not null,
  updated_at timestamptz not null default now(),
  primary key (room_id, member_id)
);

alter table public.room_games enable row level security;
alter table public.room_game_public enable row level security;
alter table public.room_game_hands enable row level security;

-- Sin políticas en room_games: ningún cliente puede leer el mazo ni las manos ajenas.

create policy room_game_public_member_select on public.room_game_public
  for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.room_id = room_game_public.room_id and m.auth_user_id = auth.uid()
  ));

create policy room_game_hands_owner_select on public.room_game_hands
  for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.id = room_game_hands.member_id and m.auth_user_id = auth.uid()
  ));

-- Realtime: la sala y la partida se sincronizan con cambios de Postgres (respetando RLS).
do $$
declare
  v_table text;
begin
  foreach v_table in array array['rooms', 'room_members', 'room_game_public', 'room_game_hands'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- Guarda una transición de la partida de forma atómica y con control de versión optimista.
create or replace function public.save_chinchon_game(
  p_room_id uuid,
  p_expected_version bigint,
  p_state jsonb,
  p_view jsonb,
  p_hands jsonb,
  p_member_id uuid,
  p_event_type text,
  p_event_data jsonb,
  p_room_status text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
  v_next bigint := p_expected_version + 1;
  v_hand record;
begin
  select version into v_current
  from public.room_games
  where room_id = p_room_id
  for update;

  if v_current is null then
    if p_expected_version <> 0 then
      raise exception 'version_conflict';
    end if;
    begin
      insert into public.room_games(room_id, state, version) values (p_room_id, p_state, v_next);
    exception when unique_violation then
      raise exception 'version_conflict';
    end;
  else
    if v_current <> p_expected_version then
      raise exception 'version_conflict';
    end if;
    update public.room_games
    set state = p_state, version = v_next, updated_at = now()
    where room_id = p_room_id;
  end if;

  insert into public.room_game_public(room_id, view, version)
  values (p_room_id, p_view, v_next)
  on conflict (room_id) do update
  set view = excluded.view, version = excluded.version, updated_at = now();

  for v_hand in select key::uuid as member_id, value as cards from jsonb_each(p_hands) loop
    insert into public.room_game_hands(room_id, member_id, cards, version)
    values (p_room_id, v_hand.member_id, v_hand.cards, v_next)
    on conflict (room_id, member_id) do update
    set cards = excluded.cards, version = excluded.version, updated_at = now();
  end loop;

  insert into public.room_events(room_id, member_id, event_type, event_data, version)
  select p_room_id, p_member_id, p_event_type, p_event_data, coalesce(max(e.version), 0) + 1
  from public.room_events e
  where e.room_id = p_room_id;

  -- Mientras se juega, la sala no caduca: cada jugada la mantiene viva 30 minutos más.
  update public.rooms
  set status = p_room_status,
      expires_at = greatest(expires_at, now() + interval '30 minutes'),
      updated_at = now()
  where id = p_room_id;

  return v_next;
end;
$$;

revoke all on function public.save_chinchon_game(uuid, bigint, jsonb, jsonb, jsonb, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_chinchon_game(uuid, bigint, jsonb, jsonb, jsonb, uuid, text, jsonb, text) to service_role;

-- Una vez empezada la partida solo pueden volver a entrar quienes ya estaban en la sala.
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
    and r.status in ('waiting', 'playing', 'finished')
    and (r.expires_at > now() or r.status <> 'waiting')
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
    set display_name = case when v_room.status = 'waiting' then trim(p_display_name) else display_name end,
        connection_status = 'connected',
        auth_user_id = auth.uid()
    where id = v_member.id;
    return public.room_payload(v_room.id);
  end if;

  if v_room.status <> 'waiting' then
    raise exception 'game_started';
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

revoke all on function public.join_private_room(text, text, text) from public;
grant execute on function public.join_private_room(text, text, text) to anon, authenticated;
