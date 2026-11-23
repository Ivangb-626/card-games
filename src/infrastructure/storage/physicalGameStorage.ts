import {
  emptyRoundScores,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PhysicalGame,
  PhysicalPlayer,
  PhysicalRoundRecord,
  SCORE_FLOOR,
  zeroRejoins,
} from '../../domain/physicalGame'

const STORAGE_KEY = 'card-games:physical-game'
const STORAGE_VERSION = 8

export type PhysicalGameLoadResult =
  | { ok: true; game: PhysicalGame | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

function readPlayers(value: unknown): PhysicalPlayer[] | null {
  if (!Array.isArray(value) || value.length < MIN_PLAYERS || value.length > MAX_PLAYERS) return null

  const players = value as Partial<PhysicalPlayer>[]
  if (!players.every((player) =>
    Boolean(player)
    && typeof player.id === 'string'
    && player.id.length > 0
    && typeof player.name === 'string'
    && player.name.trim().length > 0,
  )) return null

  const ids = players.map((player) => player.id as string)
  const names = players.map((player) => (player.name as string).trim().toLocaleLowerCase())
  if (new Set(ids).size !== players.length || new Set(names).size !== players.length) return null

  return players.map((player) => ({ id: player.id as string, name: (player.name as string).trim() }))
}

function readScoreMap(value: unknown, players: PhysicalPlayer[]): Record<string, number> | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (Object.keys(candidate).length !== players.length) return null
  if (!players.every((player) => Number.isSafeInteger(candidate[player.id]))) return null

  return Object.fromEntries(players.map((player) => [player.id, candidate[player.id] as number]))
}

function readPendingScoreMap(value: unknown, players: PhysicalPlayer[]): Record<string, number | null> | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (Object.keys(candidate).length !== players.length) return null
  if (!players.every((player) => candidate[player.id] === null || Number.isSafeInteger(candidate[player.id]))) return null

  return Object.fromEntries(players.map((player) => [player.id, candidate[player.id] as number | null]))
}

function createFirstRoundGame(players: PhysicalPlayer[], scores: Record<string, number>): PhysicalGame {
  return {
    players,
    scores: Object.fromEntries(players.map((player) => [player.id, Math.max(SCORE_FLOOR, scores[player.id])])),
    round: 1,
    roundScores: emptyRoundScores(players),
    roundClosed: false,
    rounds: [],
    rejoins: zeroRejoins(players),
    ended: false,
  }
}

function createZeroScoreGame(players: PhysicalPlayer[]): PhysicalGame {
  return createFirstRoundGame(players, Object.fromEntries(players.map((player) => [player.id, 0])))
}

function migrateLegacyGame(value: unknown, includePendingScores: boolean): PhysicalGame | null {
  if (!value || typeof value !== 'object') return null
  const legacy = value as { players?: unknown; scores?: unknown; pendingRoundScores?: unknown }
  const players = readPlayers(legacy.players)
  if (!players) return null
  if (!includePendingScores) return createZeroScoreGame(players)

  const totals = readScoreMap(legacy.scores, players)
  const pending = readPendingScoreMap(legacy.pendingRoundScores, players)
  if (!totals || !pending) return null

  const scores = Object.fromEntries(players.map((player) => {
    const pendingScore = pending[player.id]
    const score = totals[player.id] + (pendingScore ?? 0)
    return [player.id, Number.isSafeInteger(score) ? score : null]
  }))
  if (Object.values(scores).some((score) => score === null)) return null

  return createFirstRoundGame(players, scores as Record<string, number>)
}

function readRoundRecords(value: unknown, players: PhysicalPlayer[]): PhysicalRoundRecord[] | null {
  if (!Array.isArray(value)) return null
  const ids = new Set(players.map((player) => player.id))
  const records: PhysicalRoundRecord[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const candidate = item as { round?: unknown; points?: unknown; totals?: unknown; rejoins?: unknown }
    const points = readPendingScoreMap(candidate.points, players)
    const totals = readScoreMap(candidate.totals, players)
    if (!points || !totals || !Number.isSafeInteger(candidate.round) || !Array.isArray(candidate.rejoins)) return null
    const rejoins = candidate.rejoins as { playerId?: unknown; score?: unknown }[]
    if (!rejoins.every((rejoin) => Boolean(rejoin)
      && typeof rejoin.playerId === 'string'
      && ids.has(rejoin.playerId)
      && Number.isSafeInteger(rejoin.score))) return null
    records.push({
      round: candidate.round as number,
      points,
      totals,
      rejoins: rejoins.map((rejoin) => ({ playerId: rejoin.playerId as string, score: rejoin.score as number })),
    })
  }
  return records
}

/** Lee el formato por rondas; la versión 7 aún no guardaba resumen ni reenganches. */
function readRoundGame(value: object, withHistory: boolean): PhysicalGame | null {
  const stored = value as {
    players?: unknown
    scores?: unknown
    round?: unknown
    roundScores?: unknown
    roundClosed?: unknown
    rounds?: unknown
    rejoins?: unknown
    ended?: unknown
  }
  const players = readPlayers(stored.players)
  if (!players) return null
  const scores = readScoreMap(stored.scores, players)
  const roundScores = readPendingScoreMap(stored.roundScores, players)
  if (!scores || !roundScores) return null
  if (Object.values(scores).some((score) => score < SCORE_FLOOR)) return null
  if (!Number.isSafeInteger(stored.round) || (stored.round as number) < 1) return null
  if (typeof stored.roundClosed !== 'boolean') return null

  const rounds = withHistory ? readRoundRecords(stored.rounds, players) : []
  const rejoins = withHistory ? readScoreMap(stored.rejoins, players) : zeroRejoins(players)
  if (!rounds || !rejoins || Object.values(rejoins).some((count) => count < 0)) return null

  if (stored.ended !== undefined && typeof stored.ended !== 'boolean') return null
  const ended = stored.ended === true

  return { players, scores, round: stored.round as number, roundScores, roundClosed: stored.roundClosed, rounds, rejoins, ended }
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

  if (record.version === 1 || record.version === 2) {
    const game = migrateLegacyGame(record.game, false)
    return game ? { ok: true, game } : { ok: false, error: 'invalid-data' }
  }

  if (record.version === 3 || record.version === 4 || record.version === 5) {
    const game = migrateLegacyGame(record.game, true)
    return game ? { ok: true, game } : { ok: false, error: 'invalid-data' }
  }

  if (record.version === 6 && record.game && typeof record.game === 'object') {
    const stored = record.game as { players?: unknown; scores?: unknown }
    const players = readPlayers(stored.players)
    const scores = players ? readScoreMap(stored.scores, players) : null
    return players && scores
      ? { ok: true, game: createFirstRoundGame(players, scores) }
      : { ok: false, error: 'invalid-data' }
  }

  if ((record.version === 7 || record.version === STORAGE_VERSION) && record.game && typeof record.game === 'object') {
    const game = readRoundGame(record.game, record.version === STORAGE_VERSION)
    return game ? { ok: true, game } : { ok: false, error: 'invalid-data' }
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

export function clearPhysicalGame(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
