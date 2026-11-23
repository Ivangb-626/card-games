// Árbitro de la partida de Chinchón digital: valida cada jugada con el motor compartido,
// guarda el estado completo y publica la vista común y la mano privada de cada jugador.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  applyDigitalAction,
  privateHands,
  publicEventData,
  publicView,
  startDigitalGame,
  type DigitalAction,
  type DigitalChinchonState,
} from '../_shared/digitalChinchon.ts'

type GameAction = DigitalAction | { type: 'start-game' }

type Member = {
  id: string
  display_name: string
  seat: number
  auth_user_id: string
  is_host: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function secureRandom(): number {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] / 2 ** 32
}

function readAction(value: unknown): GameAction | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const withCard = typeof candidate.cardId === 'string' && candidate.cardId.length > 0 && candidate.cardId.length < 40
  switch (candidate.type) {
    case 'start-game':
    case 'draw-deck':
    case 'draw-discard':
    case 'lay-off-ready':
    case 'rejoin':
    case 'start-next-round':
    case 'ready-next-round':
      return { type: candidate.type }
    case 'discard':
    case 'close':
    case 'take-back':
      return withCard ? { type: candidate.type, cardId: candidate.cardId as string } : null
    case 'lay-off':
      return withCard && Number.isSafeInteger(candidate.meldIndex)
        ? { type: 'lay-off', cardId: candidate.cardId as string, meldIndex: candidate.meldIndex as number }
        : null
    default:
      return null
  }
}

async function saveGame(
  admin: SupabaseClient,
  roomId: string,
  expectedVersion: number,
  state: DigitalChinchonState,
  memberId: string,
  eventType: string,
  eventData: Record<string, unknown>,
): Promise<Response> {
  const { data, error } = await admin.rpc('save_chinchon_game', {
    p_room_id: roomId,
    p_expected_version: expectedVersion,
    p_state: state,
    p_view: publicView(state),
    p_hands: privateHands(state),
    p_member_id: memberId,
    p_event_type: eventType,
    p_event_data: eventData,
    p_room_status: state.phase === 'finished' ? 'finished' : 'playing',
  })
  if (error) {
    const conflict = error.message.includes('version_conflict')
    return json({ error: conflict ? 'version-conflict' : 'save-failed' }, conflict ? 409 : 500)
  }
  return json({ ok: true, version: data })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'unauthorized' }, 401)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json({ error: 'unauthorized' }, 401)

  let body: { roomId?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid-request' }, 400)
  }
  const roomId = typeof body.roomId === 'string' ? body.roomId : null
  const action = readAction(body.action)
  if (!roomId || !action) return json({ error: 'invalid-request' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: room } = await admin.from('rooms').select('id, status').eq('id', roomId).maybeSingle()
  if (!room) return json({ error: 'room-not-found' }, 404)

  const { data: memberRows } = await admin
    .from('room_members')
    .select('id, display_name, seat, auth_user_id, is_host')
    .eq('room_id', roomId)
    .order('seat')
  const members = (memberRows ?? []) as Member[]
  const me = members.find((member) => member.auth_user_id === userData.user.id)
  if (!me) return json({ error: 'not-a-player' }, 403)

  if (action.type === 'start-game') {
    if (!me.is_host) return json({ error: 'not-host' }, 403)
    if (room.status !== 'waiting') return json({ error: 'invalid-phase' }, 409)
    const seats = members.map((member) => ({ id: member.id, name: member.display_name }))
    const started = startDigitalGame(seats, me.id, secureRandom)
    if (!started.ok) return json({ error: started.error }, 400)
    return saveGame(admin, roomId, 0, started.state, me.id, 'chinchon_game_started', {})
  }

  const { data: game } = await admin.from('room_games').select('state, version').eq('room_id', roomId).maybeSingle()
  if (!game) return json({ error: 'game-not-started' }, 409)

  const result = applyDigitalAction(game.state as DigitalChinchonState, me.id, action, secureRandom)
  if (!result.ok) return json({ error: result.error }, 400)
  return saveGame(admin, roomId, Number(game.version), result.state, me.id, `chinchon_${action.type}`, publicEventData(action))
})
