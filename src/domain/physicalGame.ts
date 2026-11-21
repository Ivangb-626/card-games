export type PhysicalPlayer = {
  id: string
  name: string
}

export type PhysicalGame = {
  players: PhysicalPlayer[]
  activePlayerIndex: number
  round: number
  turnHistory: number[]
}

export type SetupError = 'player-count' | 'empty-name' | 'duplicate-name'

export type SetupResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: SetupError }

export type UndoTurnResult =
  | { ok: true; game: PhysicalGame }
  | { ok: false; error: 'nothing-to-undo' }

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
    },
  }
}

export function advancePhysicalTurn(game: PhysicalGame): PhysicalGame {
  return {
    ...game,
    activePlayerIndex: (game.activePlayerIndex + 1) % game.players.length,
    turnHistory: [...game.turnHistory, game.activePlayerIndex],
  }
}

export function undoPhysicalTurn(game: PhysicalGame): UndoTurnResult {
  if (game.turnHistory.length === 0) return { ok: false, error: 'nothing-to-undo' }

  return {
    ok: true,
    game: {
      ...game,
      activePlayerIndex: game.turnHistory[game.turnHistory.length - 1],
      turnHistory: game.turnHistory.slice(0, -1),
    },
  }
}
