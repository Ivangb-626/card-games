export type PhysicalPlayer = {
  id: string
  name: string
}

export type PhysicalActionSnapshot = {
  actionKey: string
  activePlayerIndex: number
  turnHistory: number[]
  pendingRoundScores: Record<string, number | null>
}

export type PhysicalGame = {
  players: PhysicalPlayer[]
  activePlayerIndex: number
  round: number
  turnHistory: number[]
  scores: Record<string, number>
  roundScores: Record<string, number>[]
  pendingRoundScores: Record<string, number | null>
  actionHistory: PhysicalActionSnapshot[]
}

export type SetupError = 'player-count' | 'empty-name' | 'duplicate-name'

export type SetupResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: SetupError }

export type UndoActionResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: 'nothing-to-undo' }

export type UndoAllActionsResult = UndoActionResult

export type PendingScoreResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: 'player-not-found' | 'invalid-score' }

export type ConfirmRoundResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: 'missing-round-scores' }

export type PendingScoreValidation =
  | { ok: true }
  | { ok: false; error: 'missing-round-scores' }

export function validatePendingRoundScores(game: PhysicalGame): PendingScoreValidation {
  if (game.players.some((player) => !Number.isInteger(game.pendingRoundScores[player.id]))) {
    return { ok: false, error: 'missing-round-scores' }
  }
  return { ok: true }
}

export function createPhysicalGame(names: string[]): SetupResult {
  if (names.length < 2 || names.length > 4) return { ok: false, error: 'player-count' }

  const cleanedNames = names.map((name) => name.trim())
  if (cleanedNames.some((name) => name.length === 0)) return { ok: false, error: 'empty-name' }

  const normalizedNames = cleanedNames.map((name) => name.toLocaleLowerCase())
  if (new Set(normalizedNames).size !== cleanedNames.length) return { ok: false, error: 'duplicate-name' }

  return {
    ok: true,
    game: {
      players: cleanedNames.map((name, index) => ({ id: `player-${index + 1}`, name })),
      activePlayerIndex: 0,
      round: 1,
      turnHistory: [],
      scores: Object.fromEntries(cleanedNames.map((_, index) => [`player-${index + 1}`, 0])),
      roundScores: [],
      pendingRoundScores: Object.fromEntries(cleanedNames.map((_, index) => [`player-${index + 1}`, null])),
      actionHistory: [],
    },
  }
}

export function confirmPhysicalRound(game: PhysicalGame): ConfirmRoundResult {
  const validation = validatePendingRoundScores(game)
  if (!validation.ok) return validation

  const roundScores = Object.fromEntries(game.players.map((player) => [player.id, game.pendingRoundScores[player.id] as number]))
  return {
    ok: true,
    game: {
      ...game,
      round: game.round + 1,
      turnHistory: [],
      scores: Object.fromEntries(game.players.map((player) => [player.id, game.scores[player.id] + roundScores[player.id]])),
      roundScores: [...game.roundScores, roundScores],
      pendingRoundScores: Object.fromEntries(game.players.map((player) => [player.id, null])),
      actionHistory: [],
    },
  }
}

export function advancePhysicalTurn(game: PhysicalGame): PhysicalGame {
  return {
    ...game,
    activePlayerIndex: (game.activePlayerIndex + 1) % game.players.length,
    turnHistory: [...game.turnHistory, game.activePlayerIndex],
    actionHistory: recordUndoSnapshot(game, 'turn'),
  }
}

export function undoPhysicalAction(game: PhysicalGame): UndoActionResult {
  const previous = game.actionHistory[game.actionHistory.length - 1]
  if (!previous) return { ok: false, error: 'nothing-to-undo' }

  return {
    ok: true,
    game: {
      ...game,
      activePlayerIndex: previous.activePlayerIndex,
      turnHistory: [...previous.turnHistory],
      pendingRoundScores: { ...previous.pendingRoundScores },
      actionHistory: game.actionHistory.slice(0, -1),
    },
  }
}

export function undoAllPhysicalActions(game: PhysicalGame): UndoAllActionsResult {
  const firstAction = game.actionHistory[0]
  if (!firstAction) return { ok: false, error: 'nothing-to-undo' }

  return {
    ok: true,
    game: {
      ...game,
      activePlayerIndex: firstAction.activePlayerIndex,
      turnHistory: [...firstAction.turnHistory],
      pendingRoundScores: { ...firstAction.pendingRoundScores },
      actionHistory: [],
    },
  }
}

export function setPendingRoundScore(game: PhysicalGame, playerId: string, score: number | null): PendingScoreResult {
  if (!game.players.some((player) => player.id === playerId)) return { ok: false, error: 'player-not-found' }
  if (score !== null && !Number.isInteger(score)) return { ok: false, error: 'invalid-score' }
  if (game.pendingRoundScores[playerId] === score) return { ok: true, game }

  return {
    ok: true,
    game: {
      ...game,
      pendingRoundScores: { ...game.pendingRoundScores, [playerId]: score },
      actionHistory: recordUndoSnapshot(game, `score:${playerId}`),
    },
  }
}

function recordUndoSnapshot(game: PhysicalGame, actionKey: string): PhysicalActionSnapshot[] {
  if (actionKey.startsWith('score:') && game.actionHistory[game.actionHistory.length - 1]?.actionKey === actionKey) {
    return game.actionHistory
  }

  return [...game.actionHistory, {
    actionKey,
    activePlayerIndex: game.activePlayerIndex,
    turnHistory: [...game.turnHistory],
    pendingRoundScores: { ...game.pendingRoundScores },
  }]
}
