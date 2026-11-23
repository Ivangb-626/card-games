import type { DigitalRoom } from '../../domain/room'
import { getSupabaseClient } from './client'

export type RoomRepositoryError =
  | 'not-configured'
  | 'guest-session-failed'
  | 'room-not-found'
  | 'room-full'
  | 'name-duplicate'
  | 'game-started'
  | 'supabase-error'

export type RoomRepositoryResult =
  | { ok: true; room: DigitalRoom }
  | { ok: false; error: RoomRepositoryError; detail?: string }

type GuestSessionResult = { ok: true } | { ok: false; detail: string }

export async function ensureGuestSession(): Promise<GuestSessionResult> {
  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, detail: 'missing-client' }
  const { data } = await supabase.auth.getSession()
  if (data.session) return { ok: true }
  const result = await supabase.auth.signInAnonymously()
  return result.error ? { ok: false, detail: result.error.message } : { ok: true }
}

/** Traduce las excepciones de las funciones SQL de salas a errores conocidos. */
function roomRpcError(message: string): RoomRepositoryResult {
  const known: [string, RoomRepositoryError][] = [
    ['room_not_found', 'room-not-found'],
    ['room_full', 'room-full'],
    ['name_duplicate', 'name-duplicate'],
    ['game_started', 'game-started'],
  ]
  const match = known.find(([code]) => message.includes(code))
  return { ok: false, error: match ? match[1] : 'supabase-error', detail: message }
}

async function callRoomRpc(name: string, args: Record<string, string>): Promise<RoomRepositoryResult> {
  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, error: 'not-configured' }
  const session = await ensureGuestSession()
  if (!session.ok) return { ok: false, error: 'guest-session-failed', detail: session.detail }
  const { data, error } = await supabase.rpc(name, args)
  if (error) return roomRpcError(error.message)
  if (!data) return { ok: false, error: 'supabase-error' }
  return { ok: true, room: data as DigitalRoom }
}

export function createRoomInSupabase(identityId: string, name: string): Promise<RoomRepositoryResult> {
  return callRoomRpc('create_private_room', { p_identity_id: identityId, p_display_name: name })
}

export function joinRoomInSupabase(code: string, identityId: string, name: string): Promise<RoomRepositoryResult> {
  return callRoomRpc('join_private_room', {
    p_code: code.trim().toUpperCase(),
    p_identity_id: identityId,
    p_display_name: name,
  })
}

export async function getRoomFromSupabase(roomId: string): Promise<RoomRepositoryResult> {
  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, error: 'not-configured' }
  const { data, error } = await supabase.rpc('room_payload', { p_room_id: roomId })
  if (error || !data) return { ok: false, error: 'supabase-error' }
  return { ok: true, room: data as DigitalRoom }
}

export function subscribeToRoomInSupabase(roomId: string, onChange: (room: DigitalRoom) => void): (() => void) | null {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, () => {
      void getRoomFromSupabase(roomId).then((result) => {
        if (result.ok) onChange(result.room)
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => {
      void getRoomFromSupabase(roomId).then((result) => {
        if (result.ok) onChange(result.room)
      })
    })
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
