-- Permite entrar en una sala con la partida empezada, pero solo entre rondas (fase round-ended).

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

  -- Con la partida empezada solo se puede entrar entre rondas; la Edge Function sienta al jugador nuevo
  -- con la puntuación más alta de los que siguen en juego.
  if v_room.status = 'finished'
    or (v_room.status = 'playing' and coalesce((
      select g.view ->> 'phase' from public.room_game_public g where g.room_id = v_room.id
    ), '') <> 'round-ended') then
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
