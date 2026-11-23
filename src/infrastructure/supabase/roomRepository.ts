import type { DigitalRoom } from '../../domain/room'
import { getSupabaseClient } from './client'

export type RoomRepositoryResult =
  | { ok: true; room: DigitalRoom }
  | { ok: false; error: 'not-configured' | 'supabase-error' }

export async function ensureGuestSession(): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false
  const { data } = await supabase.auth.getSession()
  if (data.session) return true
  const result = await supabase.auth.signInAnonymously()
  return !result.error
}

export async function createRoomInSupabase(identityId: string, name: string): Promise<RoomRepositoryResult> {
  const supabase = getSupabaseClient()
  if (!supabase || !(await ensureGuestSession())) return { ok: false, error: 'not-configured' }
  const { data, error } = await supabase.rpc('create_private_room', {
    p_identity_id: identityId,
    p_display_name: name,
  })
  if (error || !data) return { ok: false, error: 'supabase-error' }
  return { ok: true, room: data as DigitalRoom }
}

export async function joinRoomInSupabase(code: string, identityId: string, name: string): Promise<RoomRepositoryResult> {
  const supabase = getSupabaseClient()
  if (!supabase || !(await ensureGuestSession())) return { ok: false, error: 'not-configured' }
  const { data, error } = await supabase.rpc('join_private_room', {
    p_code: code.trim().toUpperCase(),
    p_identity_id: identityId,
    p_display_name: name,
  })
  if (error || !data) return { ok: false, error: 'supabase-error' }
  return { ok: true, room: data as DigitalRoom }
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
