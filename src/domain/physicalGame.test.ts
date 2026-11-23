import { describe, expect, it } from 'vitest'
import {
  adjustRoundScore,
  canCloseRound,
  canRejoin,
  canStartNextRound,
  closeRound,
  createPhysicalGame,
  endGame,
  getActivePlayers,
  getBustRoundPoints,
  getLowestScorePlayers,
  getMissingRoundScores,
  getWinners,
  isGameFinished,
  rejoinPlayer,
  setRoundScore,
  startNextRound,
  type PhysicalGame,
  type PhysicalGameResult,
} from './physicalGame'

function newGame(names = ['Ana', 'Beto', 'Carla']): PhysicalGame {
  const result = createPhysicalGame(names)
  if (!result.ok) throw new Error(result.error)
  return result.game
}

function unwrap(result: PhysicalGameResult): PhysicalGame {
  if (!result.ok) throw new Error(result.error)
  return result.game
}

function playRound(game: PhysicalGame, points: Record<string, number>): PhysicalGame {
  let current = game
  for (const [playerId, value] of Object.entries(points)) current = unwrap(setRoundScore(current, playerId, value))
  return unwrap(closeRound(current))
}

/** Juega varias rondas seguidas, empezando la siguiente entre cada una. */
function playRounds(game: PhysicalGame, rounds: Record<string, number>[]): PhysicalGame {
  return rounds.reduce((current, points, index) => playRound(index === 0 ? current : unwrap(startNextRound(current)), points), game)
}

describe('Physical scorekeeper setup', () => {
  it('allows up to six players and rejects more', () => {
    expect(createPhysicalGame(['A', 'B', 'C', 'D', 'E', 'F']).ok).toBe(true)
    expect(createPhysicalGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual({ ok: false, error: 'player-count' })
    expect(createPhysicalGame(['A'])).toEqual({ ok: false, error: 'player-count' })
  })
})

describe('Physical scorekeeper rounds', () => {
  it('starts on round one with empty round entries', () => {
    const game = newGame()
    expect(game.round).toBe(1)
    expect(game.roundClosed).toBe(false)
    expect(Object.values(game.roundScores)).toEqual([null, null, null])
    expect(Object.values(game.scores)).toEqual([0, 0, 0])
  })

  it('only allows closing the round once every active player has a score', () => {
    let game = unwrap(setRoundScore(newGame(), 'player-1', 5))
    expect(canCloseRound(game)).toBe(false)
    expect(getMissingRoundScores(game).map((player) => player.id)).toEqual(['player-2', 'player-3'])
    expect(closeRound(game)).toEqual({ ok: false, error: 'missing-scores' })

    game = unwrap(setRoundScore(game, 'player-2', 0))
    game = unwrap(adjustRoundScore(game, 'player-3', 1))
    expect(canCloseRound(game)).toBe(true)
  })

  it('accumulates totals across rounds instead of resetting them', () => {
    let game = playRound(newGame(), { 'player-1': 10, 'player-2': -10, 'player-3': 4 })
    expect(game.scores).toEqual({ 'player-1': 10, 'player-2': -10, 'player-3': 4 })
    expect(canStartNextRound(game)).toBe(true)

    game = unwrap(startNextRound(game))
    expect(game.round).toBe(2)
    expect(game.roundClosed).toBe(false)
    expect(Object.values(game.roundScores)).toEqual([null, null, null])

    game = playRound(game, { 'player-1': 7, 'player-2': -10, 'player-3': 3 })
    expect(game.scores).toEqual({ 'player-1': 17, 'player-2': -20, 'player-3': 7 })
  })

  it('rejects round entries once the round is closed', () => {
    const game = playRound(newGame(), { 'player-1': 1, 'player-2': 2, 'player-3': 3 })
    expect(setRoundScore(game, 'player-1', 4)).toEqual({ ok: false, error: 'round-closed' })
    expect(closeRound(game)).toEqual({ ok: false, error: 'round-closed' })
  })

  it('does not start a new round while the current one is open', () => {
    expect(startNextRound(newGame())).toEqual({ ok: false, error: 'round-open' })
  })

  it('caps scores at -50 and declares that player the winner', () => {
    const game = playRounds(newGame(), [
      { 'player-1': -10, 'player-2': 10, 'player-3': 10 },
      { 'player-1': -50, 'player-2': 5, 'player-3': 5 },
    ])

    expect(game.scores['player-1']).toBe(-50)
    expect(getWinners(game).map((player) => player.id)).toEqual(['player-1'])
    expect(isGameFinished(game)).toBe(true)
    expect(canStartNextRound(game)).toBe(false)
    expect(startNextRound(game)).toEqual({ ok: false, error: 'game-finished' })
  })

  it('eliminates players reaching 101 and skips their round entries', () => {
    let game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 10, 'player-3': 15 },
      { 'player-1': 31, 'player-2': 10, 'player-3': 15 },
    ])
    expect(getActivePlayers(game).map((player) => player.id)).toEqual(['player-2', 'player-3'])

    game = unwrap(startNextRound(game))
    expect(setRoundScore(game, 'player-1', 5)).toEqual({ ok: false, error: 'player-eliminated' })
    game = playRound(game, { 'player-2': 5, 'player-3': 5 })
    expect(game.scores).toEqual({ 'player-1': 101, 'player-2': 25, 'player-3': 35 })
  })

  it('keeps players on exactly 100 in the game and eliminates them from 101', () => {
    const game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 70, 'player-3': 0 },
      { 'player-1': 30, 'player-2': 31, 'player-3': 0 },
    ])
    expect(getActivePlayers(game).map((player) => player.id)).toEqual(['player-1', 'player-3'])
  })
})

describe('Physical scorekeeper round entry limits', () => {
  it('caps positive round points at 70', () => {
    const game = unwrap(setRoundScore(newGame(), 'player-1', 95))
    expect(game.roundScores['player-1']).toBe(70)
  })

  it('only allows -10 and -50 as negative round points', () => {
    expect(unwrap(setRoundScore(newGame(), 'player-1', -10)).roundScores['player-1']).toBe(-10)
    expect(unwrap(setRoundScore(newGame(), 'player-1', -50)).roundScores['player-1']).toBe(-50)
    expect(setRoundScore(newGame(), 'player-1', -20)).toEqual({ ok: false, error: 'invalid-negative' })
    expect(setRoundScore(newGame(), 'player-1', -1)).toEqual({ ok: false, error: 'invalid-negative' })
  })

  it('keeps step adjustments within 0 to 70', () => {
    let game = unwrap(adjustRoundScore(newGame(), 'player-1', -1))
    expect(game.roundScores['player-1']).toBe(0)

    game = unwrap(setRoundScore(game, 'player-1', 68))
    game = unwrap(adjustRoundScore(game, 'player-1', 5))
    expect(game.roundScores['player-1']).toBe(70)
  })

  it('starts from zero when adding to a negative bonus and ignores further subtraction', () => {
    let game = unwrap(setRoundScore(newGame(), 'player-1', -50))
    expect(unwrap(adjustRoundScore(game, 'player-1', -1)).roundScores['player-1']).toBe(-50)

    game = unwrap(adjustRoundScore(game, 'player-1', 5))
    expect(game.roundScores['player-1']).toBe(5)
  })

  it('offers bust points only when reaching 101 fits in a single round', () => {
    const game = playRound(newGame(), { 'player-1': 30, 'player-2': 31, 'player-3': 70 })
    expect(getBustRoundPoints(game, 'player-1')).toBeNull()
    expect(getBustRoundPoints(game, 'player-2')).toBe(70)
    expect(getBustRoundPoints(game, 'player-3')).toBe(31)

    const next = playRound(unwrap(startNextRound(game)), { 'player-1': 0, 'player-2': 0, 'player-3': 31 })
    expect(next.scores['player-3']).toBe(101)
    expect(getBustRoundPoints(next, 'player-3')).toBeNull()
  })
})

describe('Physical scorekeeper manual end', () => {
  it('ends the game between rounds without a winner, highlighting the lowest score', () => {
    let game = playRound(newGame(), { 'player-1': 30, 'player-2': 12, 'player-3': 45 })
    game = unwrap(endGame(game))

    expect(isGameFinished(game)).toBe(true)
    expect(getWinners(game)).toEqual([])
    expect(getLowestScorePlayers(game).map((player) => player.id)).toEqual(['player-2'])
    expect(canStartNextRound(game)).toBe(false)
    expect(startNextRound(game)).toEqual({ ok: false, error: 'game-finished' })
  })

  it('ends the game mid-round discarding the unfinished round', () => {
    let game = playRound(newGame(), { 'player-1': 30, 'player-2': 12, 'player-3': 45 })
    game = unwrap(startNextRound(game))
    game = unwrap(setRoundScore(game, 'player-2', 70))
    game = unwrap(endGame(game))

    expect(isGameFinished(game)).toBe(true)
    expect(game.scores).toEqual({ 'player-1': 30, 'player-2': 12, 'player-3': 45 })
    expect(game.rounds).toHaveLength(1)
    expect(Object.values(game.roundScores)).toEqual([null, null, null])
    expect(getLowestScorePlayers(game).map((player) => player.id)).toEqual(['player-2'])
    expect(setRoundScore(game, 'player-1', 5)).toEqual({ ok: false, error: 'game-finished' })
    expect(closeRound(game)).toEqual({ ok: false, error: 'game-finished' })
  })

  it('blocks rejoining once the game has been ended', () => {
    let game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 10, 'player-3': 20 },
      { 'player-1': 31, 'player-2': 10, 'player-3': 20 },
    ])
    game = unwrap(endGame(game))
    expect(canRejoin(game, 'player-1')).toBe(false)
  })
})

describe('Physical scorekeeper rejoin', () => {
  it('lets an eliminated player rejoin at the highest active score between rounds', () => {
    const game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 20, 'player-3': 35 },
      { 'player-1': 50, 'player-2': 20, 'player-3': 30 },
    ])
    expect(canRejoin(game, 'player-1')).toBe(true)
    expect(canRejoin(game, 'player-2')).toBe(false)

    const rejoined = unwrap(rejoinPlayer(game, 'player-1'))
    expect(rejoined.scores['player-1']).toBe(65)
    expect(getActivePlayers(rejoined)).toHaveLength(3)
    expect(rejoinPlayer(game, 'player-2')).toEqual({ ok: false, error: 'rejoin-unavailable' })
  })

  it('only allows rejoining between rounds', () => {
    let game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 10, 'player-3': 10 },
      { 'player-1': 40, 'player-2': 10, 'player-3': 10 },
    ])
    game = unwrap(startNextRound(game))
    expect(canRejoin(game, 'player-1')).toBe(false)
    expect(rejoinPlayer(game, 'player-1')).toEqual({ ok: false, error: 'rejoin-unavailable' })
  })

  it('ends the game without a rejoin option when only one player is left in', () => {
    const game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 70, 'player-3': 15 },
      { 'player-1': 35, 'player-2': 31, 'player-3': 15 },
    ])
    expect(canRejoin(game, 'player-1')).toBe(false)
    expect(rejoinPlayer(game, 'player-1')).toEqual({ ok: false, error: 'rejoin-unavailable' })
    expect(getWinners(game).map((player) => player.id)).toEqual(['player-3'])
    expect(isGameFinished(game)).toBe(true)
    expect(startNextRound(game)).toEqual({ ok: false, error: 'not-enough-players' })
  })

  it('counts rejoins per player and records them in the round summary', () => {
    let game = playRounds(newGame(), [
      { 'player-1': 70, 'player-2': 5, 'player-3': 20 },
      { 'player-1': 31, 'player-2': 5, 'player-3': 20 },
    ])
    game = unwrap(rejoinPlayer(game, 'player-1'))
    expect(game.rejoins).toEqual({ 'player-1': 1, 'player-2': 0, 'player-3': 0 })

    game = playRounds(unwrap(startNextRound(game)), [{ 'player-1': 70, 'player-2': 5, 'player-3': 5 }])
    game = unwrap(rejoinPlayer(game, 'player-1'))
    expect(game.rejoins['player-1']).toBe(2)

    expect(game.rounds.map((record) => record.rejoins)).toEqual([
      [],
      [{ playerId: 'player-1', score: 40 }],
      [{ playerId: 'player-1', score: 45 }],
    ])
    expect(game.rounds[2]).toMatchObject({
      round: 3,
      points: { 'player-1': 70, 'player-2': 5, 'player-3': 5 },
      totals: { 'player-1': 110, 'player-2': 15, 'player-3': 45 },
    })
  })

  it('does not allow rejoining after someone wins at -50', () => {
    const game = playRounds(newGame(['Ana', 'Beto']), [
      { 'player-1': 70, 'player-2': -10 },
      { 'player-1': 31, 'player-2': -50 },
    ])
    expect(game.scores['player-2']).toBe(-50)
    expect(canRejoin(game, 'player-1')).toBe(false)
    expect(isGameFinished(game)).toBe(true)
  })

  it('ends the game with the lowest score when every player is eliminated', () => {
    const game = playRounds(newGame(['Ana', 'Beto']), [
      { 'player-1': 70, 'player-2': 70 },
      { 'player-1': 32, 'player-2': 40 },
    ])
    expect(canRejoin(game, 'player-1')).toBe(false)
    expect(getWinners(game).map((player) => player.id)).toEqual(['player-1'])
    expect(isGameFinished(game)).toBe(true)
  })
})
