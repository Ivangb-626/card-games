import { PhysicalGame } from '../../domain/physicalGame'

const STORAGE_KEY = 'card-games:physical-game'
const STORAGE_VERSION = 1

export type PhysicalGameLoadResult =
  | { ok: true; game: PhysicalGame | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

function isPhysicalGame(value: unknown): value is PhysicalGame {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<PhysicalGame>
  if (!Array.isArray(candidate.players) || candidate.players.length < 2 || candidate.players.length > 4) return false
  if (!Number.isInteger(candidate.activePlayerIndex) || candidate.activePlayerIndex! < 0 || candidate.activePlayerIndex! >= candidate.players.length) return false
  if (!Number.isInteger(candidate.round) || candidate.round! < 1) return false

  return candidate.players.every((player) =>
    Boolean(player)
    && typeof player.id === 'string'
    && player.id.length > 0
    && typeof player.name === 'string'
    && player.name.trim().length > 0,
  )
    && new Set(candidate.players.map((player) => player.name.trim().toLocaleLowerCase())).size === candidate.players.length
}

export function loadPhysicalGame(): PhysicalGameLoadResult {
  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return { ok: false, error: 'unavailable' }
  }

  if (!serialized) return { ok: true, game: null }

  let saved: unknown
  try {
    saved = JSON.parse(serialized)
  } catch {
    return { ok: false, error: 'invalid-data' }
  }

  if (!saved || typeof saved !== 'object') return { ok: false, error: 'invalid-data' }
  const record = saved as { version?: unknown; game?: unknown }
  if (record.version !== STORAGE_VERSION || !isPhysicalGame(record.game)) {
    return { ok: false, error: 'invalid-data' }
  }

  return { ok: true, game: record.game }
}

export function savePhysicalGame(game: PhysicalGame): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, game }))
    return true
  } catch {
    return false
  }
}
