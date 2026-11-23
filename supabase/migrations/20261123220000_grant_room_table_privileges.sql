-- En este proyecto las tablas nuevas no reciben permisos de lectura por defecto: authenticated no podía
-- leer la sala (el anfitrión no veía entrar a nadie y Realtime no enviaba cambios) y service_role no
-- podía leerla desde la Edge Function. Se conceden permisos explícitos y mínimos.

-- Clientes: ningún permiso salvo lectura, y solo donde hay una política RLS que la limita.
revoke all on public.rooms, public.room_members, public.room_invites, public.room_events,
  public.room_checkpoints, public.room_games, public.room_game_public, public.room_game_hands
  from anon, authenticated;

grant select on public.rooms, public.room_members, public.room_events, public.room_checkpoints,
  public.room_game_public, public.room_game_hands
  to authenticated;

-- Servidor (Edge Function): lectura de todo; las escrituras van por save_chinchon_game.
grant select on public.rooms, public.room_members, public.room_invites, public.room_events,
  public.room_checkpoints, public.room_games, public.room_game_public, public.room_game_hands
  to service_role;
