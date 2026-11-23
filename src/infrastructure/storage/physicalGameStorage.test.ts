import { beforeEach, describe, expect, it } from 'vitest'
import { clearPhysicalGame, loadPhysicalGame, savePhysicalGame } from './physicalGameStorage'

const STORAGE_KEY = 'card-games:physical-game'
const players = [{ id: 'player-1', name: 'Ana' }, { id: 'player-2', name: 'Beto' }]

beforeEach(() => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value) },
        removeItem: (key: string) => { store.delete(key) },
      },
    },
  })
})

describe('Physical game storage', () => {
  it('migrates simple scoreboards into the first round, keeping totals above the floor', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 6,
      game: { players, scores: { 'player-1': 40, 'player-2': -70 } },
    }))

    expect(loadPhysicalGame()).toEqual({
      ok: true,
      game: {
        players,
        scores: { 'player-1': 40, 'player-2': -50 },
        round: 1,
        roundScores: { 'player-1': null, 'player-2': null },
        roundClosed: false,
        rounds: [],
        rejoins: { 'player-1': 0, 'player-2': 0 },
        ended: false,
      },
    })
  })

  it('migrates round games saved before the summary was recorded', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 7,
      game: { players, scores: { 'player-1': 5, 'player-2': 20 }, round: 2, roundScores: { 'player-1': 3, 'player-2': null }, roundClosed: false },
    }))

    const result = loadPhysicalGame()
    expect(result.ok && result.game).toMatchObject({ round: 2, rounds: [], rejoins: { 'player-1': 0, 'player-2': 0 } })
  })

  it('round-trips the round state and clears it for a new game', () => {
    const game = {
      players,
      scores: { 'player-1': 12, 'player-2': 12 },
      round: 3,
      roundScores: { 'player-1': -10, 'player-2': null },
      roundClosed: true,
      rounds: [{
        round: 1,
        points: { 'player-1': 12, 'player-2': 101 },
        totals: { 'player-1': 12, 'player-2': 101 },
        rejoins: [{ playerId: 'player-2', score: 12 }],
      }],
      rejoins: { 'player-1': 0, 'player-2': 1 },
      ended: true,
    }
    expect(savePhysicalGame(game)).toBe(true)
    expect(loadPhysicalGame()).toEqual({ ok: true, game })

    expect(clearPhysicalGame()).toBe(true)
    expect(loadPhysicalGame()).toEqual({ ok: true, game: null })
  })

  it('rejects stored totals below the -50 floor', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 8,
      game: {
        players,
        scores: { 'player-1': -51, 'player-2': 0 },
        round: 1,
        roundScores: { 'player-1': null, 'player-2': null },
        roundClosed: false,
        rounds: [],
        rejoins: { 'player-1': 0, 'player-2': 0 },
      },
    }))
    expect(loadPhysicalGame()).toEqual({ ok: false, error: 'invalid-data' })
  })
})
