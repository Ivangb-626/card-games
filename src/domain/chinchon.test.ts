import { describe, expect, it } from 'vitest'
import {
  createChinchonRound,
  drawFromDeck,
  discardCard,
  closeChinchon,
  minimumUnmatchedPoints,
  canCloseChinchon,
  type ChinchonCard,
} from './chinchon'

describe('Chinchón domain', () => {
  it('deals seven cards to every player and leaves a discard', () => {
    const round = createChinchonRound([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ])
    expect(round.players.map((player) => player.hand.length)).toEqual([7, 7])
    expect(round.discard).toHaveLength(1)
  })

  it('allows draw and discard only on the active turn', () => {
    const round = createChinchonRound([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ])
    const drawn = drawFromDeck(round, 'a')
    expect(drawn.ok).toBe(true)
    if (!drawn.ok) return
    const drawnHand = drawn.round.players[0].hand
    const cardId = drawnHand[drawnHand.length - 1]?.id
    expect(cardId).toBeTruthy()
    const discarded = discardCard(drawn.round, 'a', cardId as string)
    expect(discarded.ok).toBe(true)
    if (!discarded.ok) return
    expect(discarded.round.activePlayerIndex).toBe(1)
  })

  it('rejects closing with more than five unmatched points', () => {
    const hand: ChinchonCard[] = [
      { id: 'a', suit: 'oros', rank: 1 },
      { id: 'b', suit: 'copas', rank: 2 },
      { id: 'c', suit: 'espadas', rank: 3 },
      { id: 'd', suit: 'bastos', rank: 4 },
      { id: 'e', suit: 'oros', rank: 5 },
      { id: 'f', suit: 'copas', rank: 6 },
      { id: 'g', suit: 'espadas', rank: 12 },
    ]
    expect(minimumUnmatchedPoints(hand)).toBeGreaterThan(5)
    expect(canCloseChinchon(hand)).toBe(false)
  })

  it('recovers the discard into a shuffled deck when the deck is exhausted', () => {
    const base = createChinchonRound([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ])
    const exhausted = {
      ...base,
      deck: [],
      discard: [
        { id: 'old-1', suit: 'oros' as const, rank: 1 },
        { id: 'old-2', suit: 'copas' as const, rank: 2 },
        { id: 'keep', suit: 'espadas' as const, rank: 3 },
      ],
    }
    const result = drawFromDeck(exhausted, 'a')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.round.deck).toHaveLength(1)
    expect(result.round.discard).toEqual([{ id: 'keep', suit: 'espadas', rank: 3 }])
  })

  it('applies a natural chinchón, zero, or unmatched-point close', () => {
    const base = createChinchonRound([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ])
    const natural = [
      { id: 'n1', suit: 'oros' as const, rank: 1 },
      { id: 'n2', suit: 'oros' as const, rank: 2 },
      { id: 'n3', suit: 'oros' as const, rank: 3 },
      { id: 'n4', suit: 'oros' as const, rank: 4 },
      { id: 'n5', suit: 'oros' as const, rank: 5 },
      { id: 'n6', suit: 'oros' as const, rank: 6 },
      { id: 'n7', suit: 'oros' as const, rank: 7 },
    ]
    const round = {
      ...base,
      players: base.players.map((player, index) => index === 0 ? { ...player, hand: natural } : player),
    }
    const result = closeChinchon(round, 'a')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.round.status).toBe('closed')
    expect(result.round.players[0].score).toBe(-50)
  })
})
