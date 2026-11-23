export const SCORE_FLOOR = -50
export const MIN_PLAYERS = 2
/** Lo tradicional son 2–4 jugadores; el marcador físico admite hasta 6. */
export const TRADITIONAL_MAX_PLAYERS = 4
export const MAX_PLAYERS = 6
export const ELIMINATION_SCORE = 101
export const MAX_ROUND_POINTS = 70
export const ALLOWED_NEGATIVE_ROUND_POINTS: readonly number[] = [-10, -50]

export type PhysicalPlayer = {
  id: string
  name: string
}

export type PhysicalRejoin = {
  playerId: string
  score: number
}

/** Resumen de una ronda cerrada de la partida en curso. */
export type PhysicalRoundRecord = {
  round: number
  points: Record<string, number | null>
  totals: Record<string, number>
  rejoins: PhysicalRejoin[]
}

export type PhysicalGame = {
  players: PhysicalPlayer[]
  scores: Record<string, number>
  round: number
  roundScores: Record<string, number | null>
  roundClosed: boolean
  rounds: PhysicalRoundRecord[]
  rejoins: Record<string, number>
  /** Terminada a mano entre rondas, sin ganador por reglas. */
  ended: boolean
}

export type SetupError = 'player-count' | 'empty-name' | 'duplicate-name'

export type SetupResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: SetupError }

export type PhysicalGameError =
  | 'player-not-found'
  | 'player-eliminated'
  | 'invalid-score'
  | 'invalid-negative'
  | 'round-closed'
  | 'round-open'
  | 'missing-scores'
  | 'game-finished'
  | 'not-enough-players'
  | 'rejoin-unavailable'

export type PhysicalGameResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: PhysicalGameError }

export function createPhysicalGame(names: string[]): SetupResult {
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) return { ok: false, error: 'player-count' }

  const cleanedNames = names.map((name) => name.trim())
  if (cleanedNames.some((name) => name.length === 0)) return { ok: false, error: 'empty-name' }

  const normalizedNames = cleanedNames.map((name) => name.toLocaleLowerCase())
  if (new Set(normalizedNames).size !== cleanedNames.length) return { ok: false, error: 'duplicate-name' }

  const players = cleanedNames.map((name, index) => ({ id: `player-${index + 1}`, name }))
  return { ok: true, game: createScoreboard(players) }
}

/** Marcador vacío para jugadores ya validados; lo reutiliza el Chinchón digital. */
export function createScoreboard(players: PhysicalPlayer[]): PhysicalGame {
  return {
    players,
    scores: Object.fromEntries(players.map((player) => [player.id, 0])),
    round: 1,
    roundScores: emptyRoundScores(players),
    roundClosed: false,
    rounds: [],
    rejoins: zeroRejoins(players),
    ended: false,
  }
}

export function emptyRoundScores(players: PhysicalPlayer[]): Record<string, null> {
  return Object.fromEntries(players.map((player) => [player.id, null]))
}

export function zeroRejoins(players: PhysicalPlayer[]): Record<string, number> {
  return Object.fromEntries(players.map((player) => [player.id, 0]))
}

export function isPlayerEliminated(game: PhysicalGame, playerId: string): boolean {
  return game.scores[playerId] >= ELIMINATION_SCORE
}

export function getActivePlayers(game: PhysicalGame): PhysicalPlayer[] {
  return game.players.filter((player) => !isPlayerEliminated(game, player.id))
}

function getFloorWinners(game: PhysicalGame): PhysicalPlayer[] {
  return game.players.filter((player) => game.scores[player.id] <= SCORE_FLOOR)
}

/**
 * Ganadores actuales: quien llega a -50; si no, el único jugador que sigue en
 * juego; si todos superan 101, quienes tienen menos puntos.
 */
export function getWinners(game: PhysicalGame): PhysicalPlayer[] {
  const floorWinners = getFloorWinners(game)
  if (floorWinners.length > 0) return floorWinners

  const active = getActivePlayers(game)
  if (active.length === 1) return active
  if (active.length > 0) return []

  const lowest = Math.min(...game.players.map((player) => game.scores[player.id]))
  return game.players.filter((player) => game.scores[player.id] === lowest)
}

/** Puntuación más alta entre los jugadores que siguen en juego, o null si no queda ninguno. */
export function getRejoinScore(game: PhysicalGame): number | null {
  const active = getActivePlayers(game)
  if (active.length === 0) return null
  return Math.max(...active.map((player) => game.scores[player.id]))
}

/** Solo se puede reenganchar entre rondas y si quedan al menos dos jugadores en juego. */
export function canRejoin(game: PhysicalGame, playerId: string): boolean {
  return game.roundClosed
    && !game.ended
    && getFloorWinners(game).length === 0
    && game.players.some((player) => player.id === playerId)
    && isPlayerEliminated(game, playerId)
    && getActivePlayers(game).length >= 2
}

/** La partida termina a mano, o cuando hay ganador y ningún jugador eliminado puede reengancharse. */
export function isGameFinished(game: PhysicalGame): boolean {
  if (game.ended) return true
  if (getWinners(game).length === 0) return false
  return !game.players.some((player) => canRejoin(game, player.id))
}

/** Jugadores con menos puntos; al acabar a mano se muestran sin considerarlos ganadores. */
export function getLowestScorePlayers(game: PhysicalGame): PhysicalPlayer[] {
  const lowest = Math.min(...game.players.map((player) => game.scores[player.id]))
  return game.players.filter((player) => game.scores[player.id] === lowest)
}

/**
 * Termina la partida sin decidir ganador, entre rondas o durante una. Los puntos
 * de una ronda sin cerrar se descartan: el resumen solo incluye rondas cerradas.
 */
export function endGame(game: PhysicalGame): PhysicalGameResult {
  if (isGameFinished(game)) return { ok: false, error: 'game-finished' }
  const roundScores = game.roundClosed ? game.roundScores : emptyRoundScores(game.players)
  return { ok: true, game: { ...game, roundScores, ended: true } }
}

export function getMissingRoundScores(game: PhysicalGame): PhysicalPlayer[] {
  return getActivePlayers(game).filter((player) => game.roundScores[player.id] === null)
}

export function canCloseRound(game: PhysicalGame): boolean {
  return !game.roundClosed && !game.ended && getActivePlayers(game).length > 0 && getMissingRoundScores(game).length === 0
}

export function canStartNextRound(game: PhysicalGame): boolean {
  return game.roundClosed && !game.ended && getFloorWinners(game).length === 0 && getActivePlayers(game).length >= 2
}

function validateRoundEntry(game: PhysicalGame, playerId: string): PhysicalGameError | null {
  if (!game.players.some((player) => player.id === playerId)) return 'player-not-found'
  if (game.ended) return 'game-finished'
  if (game.roundClosed) return 'round-closed'
  if (isPlayerEliminated(game, playerId)) return 'player-eliminated'
  return null
}

/** Los puntos positivos por encima del máximo se recortan a 70; los negativos solo pueden ser -10 o -50. */
export function setRoundScore(game: PhysicalGame, playerId: string, points: number | null): PhysicalGameResult {
  const error = validateRoundEntry(game, playerId)
  if (error) return { ok: false, error }
  if (points !== null && !Number.isSafeInteger(points)) return { ok: false, error: 'invalid-score' }
  if (points !== null && points < 0 && !ALLOWED_NEGATIVE_ROUND_POINTS.includes(points)) return { ok: false, error: 'invalid-negative' }

  const stored = points === null ? null : Math.min(points, MAX_ROUND_POINTS)
  return {
    ok: true,
    game: { ...game, roundScores: { ...game.roundScores, [playerId]: stored } },
  }
}

/**
 * Ajuste incremental dentro del rango 0–70. Desde -10 o -50, sumar parte de 0;
 * restar no cambia el valor, porque no hay otros negativos permitidos.
 */
export function adjustRoundScore(game: PhysicalGame, playerId: string, amount: number): PhysicalGameResult {
  const error = validateRoundEntry(game, playerId)
  if (error) return { ok: false, error }
  if (!Number.isSafeInteger(amount) || amount === 0) return { ok: false, error: 'invalid-score' }

  const current = game.roundScores[playerId] ?? 0
  if (current < 0 && amount < 0) return { ok: true, game }
  const next = Math.min(MAX_ROUND_POINTS, Math.max(0, Math.max(0, current) + amount))
  return setRoundScore(game, playerId, next)
}

/** Puntos de ronda que llevan al jugador justo a 101, o null si no caben en el máximo de la ronda. */
export function getBustRoundPoints(game: PhysicalGame, playerId: string): number | null {
  if (isPlayerEliminated(game, playerId)) return null
  const needed = ELIMINATION_SCORE - game.scores[playerId]
  return needed >= 1 && needed <= MAX_ROUND_POINTS ? needed : null
}

export function closeRound(game: PhysicalGame): PhysicalGameResult {
  if (game.ended) return { ok: false, error: 'game-finished' }
  if (game.roundClosed) return { ok: false, error: 'round-closed' }
  if (!canCloseRound(game)) return { ok: false, error: 'missing-scores' }

  const scores = { ...game.scores }
  for (const player of getActivePlayers(game)) {
    const total = scores[player.id] + (game.roundScores[player.id] ?? 0)
    if (!Number.isSafeInteger(total)) return { ok: false, error: 'invalid-score' }
    scores[player.id] = Math.max(SCORE_FLOOR, total)
  }

  const record: PhysicalRoundRecord = {
    round: game.round,
    points: { ...game.roundScores },
    totals: { ...scores },
    rejoins: [],
  }
  return { ok: true, game: { ...game, scores, roundClosed: true, rounds: [...game.rounds, record] } }
}

export function startNextRound(game: PhysicalGame): PhysicalGameResult {
  if (!game.roundClosed) return { ok: false, error: 'round-open' }
  if (game.ended || getFloorWinners(game).length > 0) return { ok: false, error: 'game-finished' }
  if (getActivePlayers(game).length < 2) return { ok: false, error: 'not-enough-players' }

  return {
    ok: true,
    game: {
      ...game,
      round: game.round + 1,
      roundScores: emptyRoundScores(game.players),
      roundClosed: false,
    },
  }
}

export function rejoinPlayer(game: PhysicalGame, playerId: string): PhysicalGameResult {
  if (!game.players.some((player) => player.id === playerId)) return { ok: false, error: 'player-not-found' }
  const rejoinScore = getRejoinScore(game)
  if (!canRejoin(game, playerId) || rejoinScore === null) return { ok: false, error: 'rejoin-unavailable' }

  const rejoin = { playerId, score: rejoinScore }
  const rounds = game.rounds.map((record, index) => index === game.rounds.length - 1
    ? { ...record, rejoins: [...record.rejoins, rejoin] }
    : record)
  return {
    ok: true,
    game: {
      ...game,
      scores: { ...game.scores, [playerId]: rejoinScore },
      rejoins: { ...game.rejoins, [playerId]: (game.rejoins[playerId] ?? 0) + 1 },
      rounds,
    },
  }
}
