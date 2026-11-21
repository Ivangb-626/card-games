import { PhysicalGame } from '../../domain/physicalGame'

const STORAGE_KEY = 'card-games:physical-game'
const STORAGE_VERSION = 2

export type PhysicalGameLoadResult =
  | { ok: true; game: PhysicalGame | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

function isPhysicalGameBase(value: unknown): value is Omit<PhysicalGame, 'turnHistory'> {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<Omit<PhysicalGame, 'turnHistory'>>
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

function isPhysicalGame(value: unknown): value is PhysicalGame {
  if (!isPhysicalGameBase(value)) return false
  const game = value as PhysicalGame
  return Array.isArray(game.turnHistory)
    && game.turnHistory.every((index) => Number.isInteger(index) && index >= 0 && index < game.players.length)
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
  if (record.version === 1 && isPhysicalGameBase(record.game)) {
    return { ok: true, game: { ...record.game, turnHistory: [] } }
  }
  if (record.version === STORAGE_VERSION && isPhysicalGame(record.game)) {
    return { ok: true, game: record.game }
  }
  return { ok: false, error: 'invalid-data' }
}

export function savePhysicalGame(game: PhysicalGame): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, game }))
    return true
  } catch {
    return false
  }
}
