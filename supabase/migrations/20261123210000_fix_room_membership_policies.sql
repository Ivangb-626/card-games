-- Las políticas consultaban room_members desde la propia política de room_members, lo que Postgres
-- rechaza por recursión infinita: el anfitrión no podía releer la sala ni recibir cambios por Realtime,
-- y las tablas de la partida heredaban el mismo fallo. La pertenencia se comprueba ahora con funciones
-- security definer, que leen room_members sin pasar por RLS.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id and m.auth_user_id = (select auth.uid())
  );
$$;

create or replace function private.is_own_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.id = p_member_id and m.auth_user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_room_member(uuid) from public, anon;
revoke all on function private.is_own_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.is_own_member(uuid) to authenticated;

drop policy if exists rooms_member_select on public.rooms;
create policy rooms_member_select on public.rooms
  for select to authenticated
  using (private.is_room_member(id));

drop policy if exists room_members_member_select on public.room_members;
create policy room_members_member_select on public.room_members
  for select to authenticated
  using (private.is_room_member(room_id));

drop policy if exists room_events_member_select on public.room_events;
create policy room_events_member_select on public.room_events
  for select to authenticated
  using (private.is_room_member(room_id));

drop policy if exists room_checkpoints_member_select on public.room_checkpoints;
create policy room_checkpoints_member_select on public.room_checkpoints
  for select to authenticated
  using (private.is_room_member(room_id));

drop policy if exists room_game_public_member_select on public.room_game_public;
create policy room_game_public_member_select on public.room_game_public
  for select to authenticated
  using (private.is_room_member(room_id));

drop policy if exists room_game_hands_owner_select on public.room_game_hands;
create policy room_game_hands_owner_select on public.room_game_hands
  for select to authenticated
  using (private.is_own_member(member_id));
