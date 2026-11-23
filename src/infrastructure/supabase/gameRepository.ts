import type { ChinchonCard } from '../../domain/chinchon'
import type { DigitalAction, DigitalPublicView } from '../../domain/digitalChinchon'
import { getSupabaseClient } from './client'

export type GameAction = DigitalAction | { type: 'start-game' }

export type GameSnapshot = {
  view: DigitalPublicView
  hand: ChinchonCard[]
  version: number
}

export type GameActionResult =
  | { ok: true }
  | { ok: false; error: string }

/** Envía una jugada a la Edge Function, que es quien la valida y la guarda. */
export async function sendGameAction(roomId: string, action: GameAction): Promise<GameActionResult> {
  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, error: 'not-configured' }
  const { error } = await supabase.functions.invoke('chinchon-game', { body: { roomId, action } })
  if (!error) return { ok: true }
  try {
    const response = (error as { context?: Response }).context
    const body = response ? await response.json() as { error?: unknown } : null
    if (body && typeof body.error === 'string') return { ok: false, error: body.error }
  } catch {
    // La respuesta no era JSON: se trata como fallo de red.
  }
  return { ok: false, error: 'network' }
}

export async function loadGameSnapshot(roomId: string, memberId: string): Promise<GameSnapshot | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const [publicResult, handResult] = await Promise.all([
    supabase.from('room_game_public').select('view, version').eq('room_id', roomId).maybeSingle(),
    supabase.from('room_game_hands').select('cards').eq('room_id', roomId).eq('member_id', memberId).maybeSingle(),
  ])
  if (publicResult.error || !publicResult.data) return null
  return {
    view: publicResult.data.view as DigitalPublicView,
    hand: (handResult.data?.cards ?? []) as ChinchonCard[],
    version: Number(publicResult.data.version),
  }
}

export function subscribeToGame(roomId: string, onChange: () => void): (() => void) | null {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const channel = supabase
    .channel(`game:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_game_public', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_game_hands', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
