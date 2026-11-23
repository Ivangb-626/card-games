import { describe, expect, it } from 'vitest'
import {
  bestArrangement,
  closingArrangement,
  closingPoints,
  createSpanishDeck,
  extendMeld,
  isChinchon,
  jokerEndOptions,
  orderedMeldCards,
  placeMeld,
  isValidMeld,
  minimumUnmatchedPoints,
  type ChinchonCard,
} from './chinchon'

const card = (suit: ChinchonCard['suit'], rank: number): ChinchonCard => ({ id: `${suit}-${rank}`, suit, rank })
const joker = (index = 1): ChinchonCard => ({ id: `comodin-${index}`, suit: 'comodin', rank: 0 })

describe('Chinchón deck', () => {
  it('has the 40 Spanish cards plus two jokers', () => {
    const deck = createSpanishDeck()
    expect(deck).toHaveLength(42)
    expect(deck.filter((item) => item.suit === 'comodin')).toHaveLength(2)
    expect(deck.some((item) => item.rank === 8 || item.rank === 9)).toBe(false)
    expect(new Set(deck.map((item) => item.id)).size).toBe(42)
  })
})

describe('Chinchón melds', () => {
  it('accepts groups of the same rank and runs of the same suit', () => {
    expect(isValidMeld([card('oros', 5), card('copas', 5), card('bastos', 5)])).toBe(true)
    expect(isValidMeld([card('oros', 3), card('oros', 4), card('oros', 5)])).toBe(true)
    expect(isValidMeld([card('oros', 3), card('copas', 4), card('oros', 5)])).toBe(false)
    expect(isValidMeld([card('oros', 3), card('oros', 4)])).toBe(false)
  })

  it('treats 7 and sota as consecutive', () => {
    expect(isValidMeld([card('espadas', 6), card('espadas', 7), card('espadas', 10)])).toBe(true)
    expect(isValidMeld([card('espadas', 7), card('espadas', 10), card('espadas', 11)])).toBe(true)
  })

  it('lets one joker fill a gap or extend a meld', () => {
    expect(isValidMeld([card('copas', 2), joker(), card('copas', 4)])).toBe(true)
    expect(isValidMeld([card('copas', 2), card('copas', 3), joker()])).toBe(true)
    expect(isValidMeld([card('copas', 7), card('bastos', 7), joker()])).toBe(true)
    expect(isValidMeld([card('copas', 2), joker(), joker(2)])).toBe(false)
    expect(isValidMeld([card('copas', 2), joker(), card('copas', 6)])).toBe(false)
  })

  it('validates laying a card off on an existing meld', () => {
    const run = placeMeld([card('bastos', 4), card('bastos', 5), card('bastos', 6)])!
    expect(extendMeld(run, card('bastos', 7))).not.toBeNull()
    expect(extendMeld(run, card('bastos', 3))).not.toBeNull()
    expect(extendMeld(run, card('oros', 7))).toBeNull()
    expect(extendMeld(run, card('bastos', 10))).toBeNull()

    const group = placeMeld([card('oros', 5), card('copas', 5), card('bastos', 5)])!
    expect(extendMeld(group, card('espadas', 5))).not.toBeNull()
    expect(extendMeld(group, card('espadas', 6))).toBeNull()
  })
})

describe('Chinchón jokers keep their position once placed', () => {
  const sevenSota = [joker(), card('oros', 7), card('oros', 10)]

  it('lets the closer choose which end an edge joker takes', () => {
    expect(jokerEndOptions(sevenSota)).toEqual(['low', 'high'])
    expect(orderedMeldCards(placeMeld(sevenSota, 'low')!).map((item) => item.as)).toEqual([6, null, null])
    expect(orderedMeldCards(placeMeld(sevenSota, 'high')!).map((item) => item.as)).toEqual([null, null, 11])
  })

  it('does not let a king join when the joker stands for a 6 before 7 and sota', () => {
    const asSix = placeMeld(sevenSota, 'low')!
    expect(extendMeld(asSix, card('oros', 12))).toBeNull()
    expect(extendMeld(asSix, card('oros', 11))).not.toBeNull()
    expect(extendMeld(asSix, card('oros', 5))).not.toBeNull()

    const asCaballo = placeMeld(sevenSota, 'high')!
    expect(extendMeld(asCaballo, card('oros', 12))).not.toBeNull()
    expect(extendMeld(asCaballo, card('oros', 6))).not.toBeNull()
  })

  it('fixes a joker that fills a gap without asking', () => {
    const gap = [card('copas', 2), joker(), card('copas', 4)]
    expect(jokerEndOptions(gap)).toEqual([])
    expect(orderedMeldCards(placeMeld(gap)!).map((item) => item.as)).toEqual([null, 3, null])
  })

  it('allows only one joker per meld when laying off', () => {
    const withJoker = placeMeld([card('copas', 2), joker(), card('copas', 4)])!
    expect(extendMeld(withJoker, joker(2))).toBeNull()
  })
})

describe('Chinchón hand evaluation', () => {
  it('finds the arrangement with the fewest loose points', () => {
    const hand = [card('oros', 1), card('oros', 2), card('oros', 3), card('copas', 3), card('bastos', 3), card('espadas', 12), card('copas', 11)]
    // 1-2-3 de oros deja sueltos 3+3+10+10; el trío de treses deja 1+2+10+10.
    expect(minimumUnmatchedPoints(hand)).toBe(23)
  })

  it('counts a loose joker as 25 points', () => {
    expect(minimumUnmatchedPoints([joker(), card('oros', 1)])).toBe(26)
  })

  it('allows closing with at most one loose card worth 5 or less, never a joker', () => {
    const base = [card('oros', 1), card('oros', 2), card('oros', 3), card('copas', 7), card('bastos', 7), card('espadas', 7)]
    expect(closingArrangement([...base, card('copas', 5)])?.points).toBe(5)
    expect(closingArrangement([...base, card('copas', 6)])).toBeNull()
    expect(closingArrangement([...base, joker()])?.loose).toEqual([])
    expect(closingArrangement([...base.slice(0, 5), card('copas', 1), card('copas', 2)])).toBeNull()
  })

  it('scores -10 for a full close and -50 for a natural chinchón', () => {
    const full = [card('oros', 1), card('oros', 2), card('oros', 3), card('copas', 7), card('bastos', 7), card('espadas', 7), card('oros', 7)]
    expect(closingPoints(full, bestArrangement(full))).toBe(-10)

    const chinchon = [1, 2, 3, 4, 5, 6, 7].map((rank) => card('espadas', rank))
    expect(isChinchon(chinchon)).toBe(true)
    expect(closingPoints(chinchon, bestArrangement(chinchon))).toBe(-50)

    const withJoker = [card('espadas', 1), card('espadas', 2), joker(), card('espadas', 4), card('espadas', 5), card('espadas', 6), card('espadas', 7)]
    expect(isChinchon(withJoker)).toBe(false)
    expect(closingPoints(withJoker, bestArrangement(withJoker))).toBe(-10)
  })
})
