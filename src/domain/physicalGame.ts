export type PhysicalPlayer = {
  id: string
  name: string
}

export type PhysicalGame = {
  players: PhysicalPlayer[]
  scores: Record<string, number>
}

export type SetupError = 'player-count' | 'empty-name' | 'duplicate-name'

export type SetupResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: SetupError }

export type ScoreAdjustmentResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: 'player-not-found' | 'invalid-adjustment' }

export function createPhysicalGame(names: string[]): SetupResult {
  if (names.length < 2 || names.length > 4) return { ok: false, error: 'player-count' }

  const cleanedNames = names.map((name) => name.trim())
  if (cleanedNames.some((name) => name.length === 0)) return { ok: false, error: 'empty-name' }

  const normalizedNames = cleanedNames.map((name) => name.toLocaleLowerCase())
  if (new Set(normalizedNames).size !== cleanedNames.length) return { ok: false, error: 'duplicate-name' }

  const players = cleanedNames.map((name, index) => ({ id: `player-${index + 1}`, name }))
  return {
    ok: true,
    game: {
      players,
      scores: Object.fromEntries(players.map((player) => [player.id, 0])),
    },
  }
}

export function adjustPlayerScore(game: PhysicalGame, playerId: string, amount: number): ScoreAdjustmentResult {
  if (!game.players.some((player) => player.id === playerId)) return { ok: false, error: 'player-not-found' }
  if (!Number.isSafeInteger(amount) || amount === 0) return { ok: false, error: 'invalid-adjustment' }

  const updatedScore = game.scores[playerId] + amount
  if (!Number.isSafeInteger(updatedScore)) return { ok: false, error: 'invalid-adjustment' }

  return {
    ok: true,
    game: {
      ...game,
      scores: { ...game.scores, [playerId]: updatedScore },
    },
  }
}

