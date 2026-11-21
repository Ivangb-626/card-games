import { PhysicalGame } from '../../domain/physicalGame'

const STORAGE_KEY = 'card-games:physical-game'
const STORAGE_VERSION = 5

export type PhysicalGameLoadResult =
  | { ok: true; game: PhysicalGame | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

type PhysicalGameIdentity = Omit<PhysicalGame, 'turnHistory' | 'scores' | 'roundScores' | 'pendingRoundScores' | 'actionHistory'>

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

function hasValidScoreState(value: unknown, hasRoundScores: boolean): value is PhysicalGame {
  if (!hasValidTurnHistory(value)) return false
  const game = value as Pick<PhysicalGame, 'players' | 'turnHistory'> & Partial<Pick<PhysicalGame, 'scores' | 'roundScores' | 'pendingRoundScores'>>
  if (!game.scores || typeof game.scores !== 'object' || !game.pendingRoundScores || typeof game.pendingRoundScores !== 'object') return false

  const validScores = game.players.every((player) =>
    Number.isInteger(game.scores?.[player.id])
    && (game.pendingRoundScores?.[player.id] === null || Number.isInteger(game.pendingRoundScores?.[player.id])),
  )
  if (!validScores) return false
  if (!hasRoundScores) return true
  if (!Array.isArray(game.roundScores) || game.roundScores.length !== (value as PhysicalGame).round - 1) return false

  return game.roundScores.every((roundScores) =>
    Boolean(roundScores)
    && typeof roundScores === 'object'
    && game.players.every((player) => Number.isInteger(roundScores[player.id]))
    && Object.keys(roundScores).length === game.players.length,
  )
}

function hasValidActionHistory(value: unknown): value is PhysicalGame {
  if (!hasValidScoreState(value, true)) return false
  const game = value as PhysicalGame
  return Array.isArray(game.actionHistory) && game.actionHistory.every((snapshot) =>
    Boolean(snapshot)
    && typeof snapshot.actionKey === 'string'
    && (snapshot.actionKey === 'turn' || game.players.some((player) => snapshot.actionKey === `score:${player.id}`))
    && Number.isInteger(snapshot.activePlayerIndex)
    && snapshot.activePlayerIndex >= 0
    && snapshot.activePlayerIndex < game.players.length
    && Array.isArray(snapshot.turnHistory)
    && snapshot.turnHistory.every((index) => Number.isInteger(index) && index >= 0 && index < game.players.length)
    && snapshot.pendingRoundScores
    && typeof snapshot.pendingRoundScores === 'object'
    && Object.keys(snapshot.pendingRoundScores).length === game.players.length
    && game.players.every((player) =>
      snapshot.pendingRoundScores[player.id] === null
      || Number.isInteger(snapshot.pendingRoundScores[player.id]),
    ),
  )
}

function createActionHistoryFromTurns(game: Pick<PhysicalGame, 'players' | 'turnHistory' | 'pendingRoundScores'>): PhysicalGame['actionHistory'] {
  return game.turnHistory.map((activePlayerIndex, index) => ({
    actionKey: 'turn',
    activePlayerIndex,
    turnHistory: game.turnHistory.slice(0, index),
    pendingRoundScores: { ...game.pendingRoundScores },
  }))
}

function createEmptyScoreState(game: PhysicalGameIdentity, turnHistory: number[] = []): PhysicalGame {
  const scoreState = {
    ...game,
    turnHistory,
    scores: Object.fromEntries(game.players.map((player) => [player.id, 0])),
    roundScores: [],
    pendingRoundScores: Object.fromEntries(game.players.map((player) => [player.id, null])),
    actionHistory: [],
  }
  return { ...scoreState, actionHistory: createActionHistoryFromTurns(scoreState) }
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
  if (record.version === 3 && hasValidScoreState(record.game, false)) {
    const game = { ...record.game, roundScores: [] }
    return { ok: true, game: { ...game, actionHistory: createActionHistoryFromTurns(game) } }
  }
  if (record.version === 4 && hasValidScoreState(record.game, true)) {
    return { ok: true, game: { ...record.game, actionHistory: createActionHistoryFromTurns(record.game) } }
  }
  if (record.version === STORAGE_VERSION && hasValidActionHistory(record.game)) {
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
