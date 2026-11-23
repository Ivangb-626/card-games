import { describe, expect, it } from 'vitest'
import type { ChinchonCard } from './chinchon'
import {
  addLateSeats,
  applyDigitalAction,
  privateHands,
  publicEventData,
  publicView,
  requiredNextRoundReady,
  startDigitalGame,
  type DigitalAction,
  type DigitalChinchonState,
  type DigitalResult,
  type DigitalSeat,
} from './digitalChinchon'

const card = (suit: ChinchonCard['suit'], rank: number): ChinchonCard => ({ id: `${suit}-${rank}`, suit, rank })

const seats: DigitalSeat[] = [
  { id: 'host', name: 'Ana' },
  { id: 'beto', name: 'Beto' },
  { id: 'carla', name: 'Carla' },
]

function seededRandom(seed = 7): () => number {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function unwrap(result: DigitalResult): DigitalChinchonState {
  if (!result.ok) throw new Error(result.error)
  return result.state
}

function start(players = seats): DigitalChinchonState {
  return unwrap(startDigitalGame(players, 'host', seededRandom()))
}

function act(state: DigitalChinchonState, playerId: string, action: DigitalAction): DigitalChinchonState {
  return unwrap(applyDigitalAction(state, playerId, action, seededRandom(3)))
}

const closerHand = [
  card('oros', 1), card('oros', 2), card('oros', 3),
  card('copas', 7), card('bastos', 7), card('espadas', 7),
  card('copas', 4), card('copas', 12),
]

/** Partida a punto de cerrar: le toca a Ana con 8 cartas en la mano. */
function readyToClose(): DigitalChinchonState {
  const state = start()
  return {
    ...state,
    hasDrawn: true,
    hands: {
      host: closerHand,
      beto: [card('oros', 4), card('oros', 5), card('espadas', 1), card('espadas', 2), card('bastos', 10), card('bastos', 11), card('copas', 1)],
      carla: [card('oros', 7), card('bastos', 1), card('bastos', 2), card('bastos', 3), card('copas', 5), card('copas', 6), card('espadas', 12)],
    },
  }
}

describe('Digital Chinchón setup', () => {
  it('deals seven cards to every player and starts with the host', () => {
    const state = start()
    expect(Object.values(state.hands).map((hand) => hand.length)).toEqual([7, 7, 7])
    expect(state.discard).toHaveLength(1)
    expect(state.deck).toHaveLength(42 - 21 - 1)
    expect(state.activePlayerId).toBe('host')
    expect(state.scoreboard.round).toBe(1)
  })

  it('requires two to four players', () => {
    expect(startDigitalGame([seats[0]], 'host')).toEqual({ ok: false, error: 'player-count' })
  })
})

describe('Digital Chinchón turns', () => {
  it('enforces turn order and drawing before discarding', () => {
    const state = start()
    expect(applyDigitalAction(state, 'beto', { type: 'draw-deck' })).toEqual({ ok: false, error: 'not-your-turn' })
    expect(applyDigitalAction(state, 'host', { type: 'discard', cardId: state.hands.host[0].id })).toEqual({ ok: false, error: 'must-draw-first' })

    const drawn = act(state, 'host', { type: 'draw-deck' })
    expect(drawn.hands.host).toHaveLength(8)
    expect(applyDigitalAction(drawn, 'host', { type: 'draw-discard' })).toEqual({ ok: false, error: 'already-drawn' })

    const discarded = act(drawn, 'host', { type: 'discard', cardId: drawn.hands.host[0].id })
    expect(discarded.hands.host).toHaveLength(7)
    expect(discarded.discard[discarded.discard.length - 1]).toEqual(drawn.hands.host[0])
    expect(discarded.activePlayerId).toBe('beto')
  })

  it('takes the top discard when drawing from the discard pile', () => {
    const state = start()
    const top = state.discard[0]
    const drawn = act(state, 'host', { type: 'draw-discard' })
    expect(drawn.hands.host).toContainEqual(top)
    expect(drawn.discard).toHaveLength(0)
  })

  it('reshuffles the discard pile when the deck runs out', () => {
    const state = { ...start(), deck: [], discard: [card('oros', 1), card('oros', 2), card('oros', 3)] }
    const drawn = act(state, 'host', { type: 'draw-deck' })
    expect(drawn.discard).toEqual([card('oros', 3)])
    expect(drawn.deck).toHaveLength(1)
  })
})

describe('Digital Chinchón closing and laying off', () => {
  it('rejects closes that leave more than one loose card or one above 5', () => {
    const state = readyToClose()
    expect(applyDigitalAction(state, 'host', { type: 'close', cardId: 'copas-4' })).toEqual({ ok: false, error: 'cannot-close' })
  })

  it('closes setting a card aside and opens the lay-off phase', () => {
    const closed = act(readyToClose(), 'host', { type: 'close', cardId: 'copas-12' })
    expect(closed.phase).toBe('laying-off')
    expect(closed.closing?.points).toBe(4)
    expect(closed.closing?.arrangement.loose).toEqual([card('copas', 4)])

    const view = publicView(closed)
    expect(view.closing?.melds).toHaveLength(2)
    expect(JSON.stringify(view)).not.toContain('copas-12')
    expect(JSON.stringify(view)).not.toContain('copas-4')
  })

  it('lets other players lay off valid cards, take them back and get ready', () => {
    let state = act(readyToClose(), 'host', { type: 'close', cardId: 'copas-12' })
    const runIndex = state.closing!.arrangement.melds.findIndex((meld) => meld.some((item) => item.id === 'oros-1'))
    const groupIndex = 1 - runIndex

    expect(applyDigitalAction(state, 'beto', { type: 'lay-off', cardId: 'copas-1', meldIndex: runIndex })).toEqual({ ok: false, error: 'cannot-lay-off' })
    expect(applyDigitalAction(state, 'host', { type: 'lay-off', cardId: 'copas-4', meldIndex: runIndex })).toEqual({ ok: false, error: 'is-closer' })

    state = act(state, 'beto', { type: 'lay-off', cardId: 'oros-4', meldIndex: runIndex })
    state = act(state, 'beto', { type: 'lay-off', cardId: 'oros-5', meldIndex: runIndex })
    state = act(state, 'carla', { type: 'lay-off', cardId: 'oros-7', meldIndex: groupIndex })
    // Beto no puede devolver el 4 mientras el 5 depende de él.
    expect(applyDigitalAction(state, 'beto', { type: 'take-back', cardId: 'oros-4' })).toEqual({ ok: false, error: 'invalid-meld' })
    state = act(state, 'beto', { type: 'take-back', cardId: 'oros-5' })
    state = act(state, 'beto', { type: 'lay-off', cardId: 'oros-5', meldIndex: runIndex })

    state = act(state, 'beto', { type: 'lay-off-ready' })
    expect(state.phase).toBe('laying-off')
    expect(applyDigitalAction(state, 'beto', { type: 'lay-off', cardId: 'copas-1', meldIndex: groupIndex })).toEqual({ ok: false, error: 'already-ready' })

    state = act(state, 'carla', { type: 'lay-off-ready' })
    expect(state.phase).toBe('round-ended')
    // Ana: 4 suelto. Beto: 1+2+10+10+1 = 24. Carla: escalera 1-2-3 de bastos, sueltas 5+6+10 = 21.
    expect(state.scoreboard.scores).toEqual({ host: 4, beto: 24, carla: 21 })
    expect(state.revealed?.find((hand) => hand.playerId === 'beto')?.laidOff.map((item) => item.id)).toEqual(['oros-4', 'oros-5'])
    expect(publicView(state).revealed).toHaveLength(3)
  })

  it('skips laying off after a -10 close and scores the round directly', () => {
    const state = readyToClose()
    const fullClose = {
      ...state,
      hands: { ...state.hands, host: [...closerHand.slice(0, 6), card('oros', 7), card('copas', 12)] },
    }
    const closed = act(fullClose, 'host', { type: 'close', cardId: 'copas-12' })
    expect(closed.phase).toBe('round-ended')
    expect(closed.scoreboard.scores.host).toBe(-10)
    expect(applyDigitalAction(closed, 'beto', { type: 'lay-off', cardId: 'oros-4', meldIndex: 0 })).toEqual({ ok: false, error: 'invalid-phase' })
  })

  it('keeps the joker position chosen by the closer when others lay off', () => {
    const state = readyToClose()
    const withJoker: DigitalChinchonState = {
      ...state,
      hands: {
        ...state.hands,
        host: [{ id: 'comodin-1', suit: 'comodin', rank: 0 }, card('oros', 7), card('oros', 10), card('copas', 1), card('bastos', 1), card('espadas', 1), card('copas', 2), card('copas', 12)],
        beto: [card('oros', 12), card('oros', 11), card('espadas', 2), card('espadas', 3), card('bastos', 10), card('bastos', 11), card('copas', 3)],
      },
    }
    let closed = act(withJoker, 'host', { type: 'close', cardId: 'copas-12', jokerEnd: 'low' })
    expect(closed.phase).toBe('laying-off')
    const runIndex = closed.closing!.melds.findIndex((meld) => meld.kind === 'run')
    expect(applyDigitalAction(closed, 'beto', { type: 'lay-off', cardId: 'oros-12', meldIndex: runIndex })).toEqual({ ok: false, error: 'cannot-lay-off' })
    closed = act(closed, 'beto', { type: 'lay-off', cardId: 'oros-11', meldIndex: runIndex })
    closed = act(closed, 'beto', { type: 'lay-off', cardId: 'oros-12', meldIndex: runIndex })
    expect(closed.closing!.layOffs).toHaveLength(2)
  })

  it('does not reveal the closing card in the event log', () => {
    expect(publicEventData({ type: 'close', cardId: 'copas-12' })).toEqual({ type: 'close' })
  })
})

describe('Digital Chinchón between rounds', () => {
  function roundEnded(): DigitalChinchonState {
    let state = act(readyToClose(), 'host', { type: 'close', cardId: 'copas-12' })
    state = act(state, 'beto', { type: 'lay-off-ready' })
    return act(state, 'carla', { type: 'lay-off-ready' })
  }

  it('starts the next round when the host asks, rotating the starting player', () => {
    const state = roundEnded()
    expect(applyDigitalAction(state, 'beto', { type: 'start-next-round' })).toEqual({ ok: false, error: 'not-host' })
    const next = act(state, 'host', { type: 'start-next-round' })
    expect(next.phase).toBe('playing')
    expect(next.scoreboard.round).toBe(2)
    expect(next.activePlayerId).toBe('beto')
    expect(Object.values(next.hands).map((hand) => hand.length)).toEqual([7, 7, 7])
  })

  it('also starts once two non-host players are ready', () => {
    let state = roundEnded()
    expect(requiredNextRoundReady(state)).toBe(2)
    expect(applyDigitalAction(state, 'host', { type: 'ready-next-round' })).toEqual({ ok: false, error: 'host-cannot-ready' })
    state = act(state, 'beto', { type: 'ready-next-round' })
    expect(state.phase).toBe('round-ended')
    state = act(state, 'carla', { type: 'ready-next-round' })
    expect(state.phase).toBe('playing')
  })

  it('needs only the other player to be ready in a two-player game', () => {
    expect(requiredNextRoundReady({ seats: seats.slice(0, 2), hostId: 'host' })).toBe(1)
  })

  it('lets eliminated players rejoin between rounds and deals them in', () => {
    let state = roundEnded()
    state = {
      ...state,
      scoreboard: { ...state.scoreboard, scores: { host: 40, beto: 105, carla: 30 } },
    }
    state = act(state, 'beto', { type: 'rejoin' })
    expect(state.scoreboard.scores.beto).toBe(40)
    expect(state.scoreboard.rejoins.beto).toBe(1)

    const next = act(state, 'host', { type: 'start-next-round' })
    expect(next.turnOrder).toEqual(['host', 'beto', 'carla'])
  })

  it('skips eliminated players when dealing the next round', () => {
    let state = roundEnded()
    state = { ...state, scoreboard: { ...state.scoreboard, scores: { host: 40, beto: 105, carla: 30 } } }
    const next = act(state, 'host', { type: 'start-next-round' })
    expect(next.turnOrder).toEqual(['host', 'carla'])
    expect(privateHands(next).beto).toEqual([])
    expect(next.activePlayerId).toBe('carla')
  })

  it('finishes the game when a natural chinchón takes a player to -50', () => {
    const chinchon = [1, 2, 3, 4, 5, 6, 7].map((rank) => card('espadas', rank))
    const state: DigitalChinchonState = {
      ...readyToClose(),
      hands: { ...readyToClose().hands, host: [...chinchon, card('copas', 12)] },
    }
    // Con chinchón no se liga: la ronda se puntúa al cerrar.
    const closed = act(state, 'host', { type: 'close', cardId: 'copas-12' })
    expect(closed.scoreboard.scores.host).toBe(-50)
    expect(closed.phase).toBe('finished')
  })
})

describe('Digital Chinchón late joiners', () => {
  function roundEnded(): DigitalChinchonState {
    let state = unwrap(startDigitalGame(seats.slice(0, 2), 'host', seededRandom()))
    state = {
      ...state,
      hasDrawn: true,
      hands: {
        host: closerHand,
        beto: [card('oros', 4), card('oros', 5), card('espadas', 1), card('espadas', 2), card('bastos', 10), card('bastos', 11), card('copas', 1)],
      },
    }
    state = act(state, 'host', { type: 'close', cardId: 'copas-12' })
    return act(state, 'beto', { type: 'lay-off-ready' })
  }

  it('seats a new player between rounds with the highest score still in play', () => {
    const state = roundEnded()
    const joined = addLateSeats(state, [{ id: 'host', name: 'Ana' }, { id: 'beto', name: 'Beto' }, { id: 'dani', name: 'Dani' }])
    expect(joined.seats.map((seat) => seat.id)).toEqual(['host', 'beto', 'dani'])
    expect(joined.scoreboard.scores.dani).toBe(Math.max(joined.scoreboard.scores.host, joined.scoreboard.scores.beto))
    expect(joined.scoreboard.rejoins.dani).toBe(0)

    const next = act(joined, 'host', { type: 'start-next-round' })
    expect(next.turnOrder).toContain('dani')
    expect(next.hands.dani).toHaveLength(7)
  })

  it('does not seat anyone in the middle of a round or above four players', () => {
    const playing = start()
    expect(addLateSeats(playing, [{ id: 'dani', name: 'Dani' }])).toBe(playing)

    const full = addLateSeats(roundEnded(), [{ id: 'carla', name: 'Carla' }, { id: 'dani', name: 'Dani' }, { id: 'eva', name: 'Eva' }])
    expect(full.seats).toHaveLength(4)
  })
})

describe('Digital Chinchón public view', () => {
  it('never exposes the deck or other hands', () => {
    const state = start()
    const view = publicView(state)
    expect(view).not.toHaveProperty('deck')
    expect(view).not.toHaveProperty('hands')
    expect(view.handCounts).toEqual({ host: 7, beto: 7, carla: 7 })
    expect(view.deckCount).toBe(20)
    const serialized = JSON.stringify(view)
    for (const hidden of [...state.hands.beto, ...state.deck]) expect(serialized).not.toContain(`"${hidden.id}"`)
  })
})
