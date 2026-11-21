import { PhysicalGame } from '../../domain/physicalGame'

const STORAGE_KEY = 'card-games:physical-game'
const STORAGE_VERSION = 3

export type PhysicalGameLoadResult =
  | { ok: true; game: PhysicalGame | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

type PhysicalGameIdentity = Omit<PhysicalGame, 'turnHistory' | 'scores' | 'pendingRoundScores'>

function isPhysicalGameBase(value: unknown): value is PhysicalGameIdentity {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<PhysicalGameIdentity>
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

function hasValidTurnHistory(value: unknown): value is PhysicalGameIdentity & { turnHistory: number[] } {
  if (!isPhysicalGameBase(value)) return false
  const turnHistory = (value as Partial<PhysicalGame>).turnHistory
  return Array.isArray(turnHistory)
    && turnHistory.every((index) => Number.isInteger(index) && index >= 0 && index < value.players.length)
}

function hasValidScoreState(value: unknown): value is PhysicalGame {
  if (!hasValidTurnHistory(value)) return false
  const game = value as Pick<PhysicalGame, 'players' | 'turnHistory'> & Partial<Pick<PhysicalGame, 'scores' | 'pendingRoundScores'>>
  if (!game.scores || typeof game.scores !== 'object' || !game.pendingRoundScores || typeof game.pendingRoundScores !== 'object') return false

  return game.players.every((player) =>
    Number.isInteger(game.scores?.[player.id])
    && (game.pendingRoundScores?.[player.id] === null || Number.isInteger(game.pendingRoundScores?.[player.id])),
  )
}

function createEmptyScoreState(game: PhysicalGameIdentity, turnHistory: number[] = []): PhysicalGame {
  return {
    ...game,
    turnHistory,
    scores: Object.fromEntries(game.players.map((player) => [player.id, 0])),
    pendingRoundScores: Object.fromEntries(game.players.map((player) => [player.id, null])),
  }
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
    return { ok: true, game: createEmptyScoreState(record.game) }
  }
  if (record.version === 2 && hasValidTurnHistory(record.game)) {
    return { ok: true, game: createEmptyScoreState(record.game, record.game.turnHistory) }
  }
  if (record.version === STORAGE_VERSION && hasValidScoreState(record.game)) {
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
