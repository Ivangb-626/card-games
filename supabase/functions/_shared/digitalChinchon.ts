// Partida de Chinchón digital. Es autoritativa en la Edge Function y se comparte tal cual con ella:
// solo importa módulos sin dependencias y con extensión explícita para que Deno los resuelva.
import {
  bestArrangement,
  canLayOff,
  closingArrangement,
  closingPoints,
  createSpanishDeck,
  HAND_SIZE,
  isValidMeld,
  shuffleCards,
  type ChinchonCard,
  type HandArrangement,
} from './chinchon.ts'
import {
  canRejoin,
  canStartNextRound,
  closeRound,
  createScoreboard,
  getActivePlayers,
  isGameFinished,
  rejoinPlayer,
  setRoundScore,
  startNextRound,
  type PhysicalGame,
} from './physicalGame.ts'

export const DIGITAL_MIN_PLAYERS = 2
export const DIGITAL_MAX_PLAYERS = 4

export type DigitalSeat = {
  id: string
  name: string
}

export type DigitalPhase = 'playing' | 'laying-off' | 'round-ended' | 'finished'

export type DigitalLayOff = {
  playerId: string
  card: ChinchonCard
  meldIndex: number
}

export type DigitalClosing = {
  closerId: string
  closingCard: ChinchonCard
  /** Mano del que cierra sin la carta apartada. */
  hand: ChinchonCard[]
  arrangement: HandArrangement
  points: number
  layOffs: DigitalLayOff[]
  ready: string[]
}

export type DigitalRevealedHand = {
  playerId: string
  arrangement: HandArrangement
  laidOff: ChinchonCard[]
  closingCard: ChinchonCard | null
  points: number
}

/** Estado completo, solo en el servidor: incluye mazo y manos. */
export type DigitalChinchonState = {
  seats: DigitalSeat[]
  hostId: string
  scoreboard: PhysicalGame
  phase: DigitalPhase
  deck: ChinchonCard[]
  discard: ChinchonCard[]
  hands: Record<string, ChinchonCard[]>
  turnOrder: string[]
  starterId: string
  activePlayerId: string
  hasDrawn: boolean
  closing: DigitalClosing | null
  revealed: DigitalRevealedHand[] | null
  nextRoundReady: string[]
}

export type DigitalAction =
  | { type: 'draw-deck' }
  | { type: 'draw-discard' }
  | { type: 'discard'; cardId: string }
  | { type: 'close'; cardId: string }
  | { type: 'lay-off'; cardId: string; meldIndex: number }
  | { type: 'take-back'; cardId: string }
  | { type: 'lay-off-ready' }
  | { type: 'rejoin' }
  | { type: 'start-next-round' }
  | { type: 'ready-next-round' }

export type DigitalError =
  | 'player-count'
  | 'not-a-player'
  | 'invalid-phase'
  | 'not-your-turn'
  | 'already-drawn'
  | 'must-draw-first'
  | 'deck-empty'
  | 'card-not-in-hand'
  | 'cannot-close'
  | 'cannot-lay-off'
  | 'invalid-meld'
  | 'already-ready'
  | 'is-closer'
  | 'rejoin-unavailable'
  | 'not-host'
  | 'host-cannot-ready'
  | 'cannot-start-round'

export type DigitalResult =
  | { ok: true; state: DigitalChinchonState }
  | { ok: false; error: DigitalError }

/** Lo que ven todos los jugadores: nunca contiene manos ocultas ni el mazo. */
export type DigitalPublicView = {
  seats: DigitalSeat[]
  hostId: string
  scoreboard: PhysicalGame
  phase: DigitalPhase
  turnOrder: string[]
  activePlayerId: string
  hasDrawn: boolean
  deckCount: number
  discardTop: ChinchonCard | null
  handCounts: Record<string, number>
  closing: {
    closerId: string
    melds: ChinchonCard[][]
    layOffs: DigitalLayOff[]
    ready: string[]
  } | null
  revealed: DigitalRevealedHand[] | null
  nextRoundReady: string[]
}

type Random = () => number

function fail(error: DigitalError): DigitalResult {
  return { ok: false, error }
}

function nextActiveAfter(seats: DigitalSeat[], active: string[], fromId: string): string {
  const startIndex = seats.findIndex((seat) => seat.id === fromId)
  for (let offset = 1; offset <= seats.length; offset += 1) {
    const candidate = seats[(startIndex + offset) % seats.length]
    if (active.includes(candidate.id)) return candidate.id
  }
  return active[0]
}

function dealRound(state: DigitalChinchonState, starterId: string, random: Random): DigitalChinchonState {
  const active = getActivePlayers(state.scoreboard).map((player) => player.id)
  const turnOrder = state.seats.map((seat) => seat.id).filter((id) => active.includes(id))
  const deck = shuffleCards(createSpanishDeck(), random)
  const hands: Record<string, ChinchonCard[]> = Object.fromEntries(turnOrder.map((id) => [id, [] as ChinchonCard[]]))
  for (let dealt = 0; dealt < HAND_SIZE; dealt += 1) {
    for (const id of turnOrder) hands[id].push(deck.shift() as ChinchonCard)
  }
  const firstDiscard = deck.shift() as ChinchonCard
  return {
    ...state,
    phase: 'playing',
    deck,
    discard: [firstDiscard],
    hands,
    turnOrder,
    starterId,
    activePlayerId: starterId,
    hasDrawn: false,
    closing: null,
    revealed: null,
    nextRoundReady: [],
  }
}

export function startDigitalGame(seats: DigitalSeat[], hostId: string, random: Random = Math.random): DigitalResult {
  if (seats.length < DIGITAL_MIN_PLAYERS || seats.length > DIGITAL_MAX_PLAYERS) return fail('player-count')
  if (!seats.some((seat) => seat.id === hostId)) return fail('not-a-player')

  const initial: DigitalChinchonState = {
    seats,
    hostId,
    scoreboard: createScoreboard(seats.map((seat) => ({ id: seat.id, name: seat.name }))),
    phase: 'playing',
    deck: [],
    discard: [],
    hands: {},
    turnOrder: [],
    starterId: seats[0].id,
    activePlayerId: seats[0].id,
    hasDrawn: false,
    closing: null,
    revealed: null,
    nextRoundReady: [],
  }
  return { ok: true, state: dealRound(initial, seats[0].id, random) }
}

function withHand(state: DigitalChinchonState, playerId: string, hand: ChinchonCard[]): Record<string, ChinchonCard[]> {
  return { ...state.hands, [playerId]: hand }
}

function drawFromDeck(state: DigitalChinchonState, playerId: string, random: Random): DigitalResult {
  let deck = state.deck
  let discard = state.discard
  if (deck.length === 0) {
    // Se rebaraja el descarte dejando visible la última carta.
    if (discard.length <= 1) return fail('deck-empty')
    deck = shuffleCards(discard.slice(0, -1), random)
    discard = discard.slice(-1)
  }
  const [card, ...rest] = deck
  return {
    ok: true,
    state: { ...state, deck: rest, discard, hasDrawn: true, hands: withHand(state, playerId, [...state.hands[playerId], card]) },
  }
}

function drawFromDiscard(state: DigitalChinchonState, playerId: string): DigitalResult {
  const card = state.discard[state.discard.length - 1]
  if (!card) return fail('deck-empty')
  return {
    ok: true,
    state: {
      ...state,
      discard: state.discard.slice(0, -1),
      hasDrawn: true,
      hands: withHand(state, playerId, [...state.hands[playerId], card]),
    },
  }
}

function discardCard(state: DigitalChinchonState, playerId: string, cardId: string): DigitalResult {
  const hand = state.hands[playerId]
  const card = hand.find((candidate) => candidate.id === cardId)
  if (!card) return fail('card-not-in-hand')
  return {
    ok: true,
    state: {
      ...state,
      discard: [...state.discard, card],
      hands: withHand(state, playerId, hand.filter((candidate) => candidate.id !== cardId)),
      hasDrawn: false,
      activePlayerId: nextActiveAfter(state.seats, state.turnOrder, playerId),
    },
  }
}

function closeWith(state: DigitalChinchonState, playerId: string, cardId: string): DigitalResult {
  const hand = state.hands[playerId]
  const closingCard = hand.find((candidate) => candidate.id === cardId)
  if (!closingCard) return fail('card-not-in-hand')
  const remaining = hand.filter((candidate) => candidate.id !== cardId)
  const arrangement = closingArrangement(remaining)
  if (!arrangement) return fail('cannot-close')

  const closing: DigitalClosing = {
    closerId: playerId,
    closingCard,
    hand: remaining,
    arrangement,
    points: closingPoints(remaining, arrangement),
    layOffs: [],
    ready: [],
  }
  const next: DigitalChinchonState = {
    ...state,
    phase: 'laying-off',
    hands: withHand(state, playerId, remaining),
    hasDrawn: false,
    closing,
  }
  return { ok: true, state: next.turnOrder.length <= 1 ? finishRound(next) : next }
}

/** Cartas de cada combinación del que cierra, incluidas las ya ligadas. */
export function closingMelds(closing: Pick<DigitalClosing, 'arrangement' | 'layOffs'>): ChinchonCard[][] {
  return closing.arrangement.melds.map((meld, index) => [
    ...meld,
    ...closing.layOffs.filter((layOff) => layOff.meldIndex === index).map((layOff) => layOff.card),
  ])
}

function layOff(state: DigitalChinchonState, playerId: string, cardId: string, meldIndex: number): DigitalResult {
  const closing = state.closing as DigitalClosing
  if (closing.closerId === playerId) return fail('is-closer')
  if (closing.ready.includes(playerId)) return fail('already-ready')
  const card = state.hands[playerId].find((candidate) => candidate.id === cardId)
  if (!card || closing.layOffs.some((item) => item.card.id === cardId)) return fail('card-not-in-hand')
  const meld = closingMelds(closing)[meldIndex]
  if (!meld) return fail('invalid-meld')
  if (!canLayOff(meld, card)) return fail('cannot-lay-off')

  return {
    ok: true,
    state: { ...state, closing: { ...closing, layOffs: [...closing.layOffs, { playerId, card, meldIndex }] } },
  }
}

function takeBack(state: DigitalChinchonState, playerId: string, cardId: string): DigitalResult {
  const closing = state.closing as DigitalClosing
  if (closing.ready.includes(playerId)) return fail('already-ready')
  const layOffs = closing.layOffs.filter((item) => !(item.playerId === playerId && item.card.id === cardId))
  if (layOffs.length === closing.layOffs.length) return fail('card-not-in-hand')
  // Retirar una carta no puede romper una escalera que otros han seguido ampliando.
  if (!closingMelds({ ...closing, layOffs }).every(isValidMeld)) return fail('invalid-meld')
  return { ok: true, state: { ...state, closing: { ...closing, layOffs } } }
}

function finishRound(state: DigitalChinchonState): DigitalChinchonState {
  const closing = state.closing as DigitalClosing
  const revealed: DigitalRevealedHand[] = state.turnOrder.map((playerId) => {
    if (playerId === closing.closerId) {
      return { playerId, arrangement: closing.arrangement, laidOff: [], closingCard: closing.closingCard, points: closing.points }
    }
    const laidIds = new Set(closing.layOffs.filter((item) => item.playerId === playerId).map((item) => item.card.id))
    const hand = state.hands[playerId]
    const arrangement = bestArrangement(hand.filter((card) => !laidIds.has(card.id)))
    return {
      playerId,
      arrangement,
      laidOff: hand.filter((card) => laidIds.has(card.id)),
      closingCard: null,
      points: arrangement.points,
    }
  })

  let scoreboard = state.scoreboard
  for (const hand of revealed) {
    const result = setRoundScore(scoreboard, hand.playerId, hand.points)
    if (result.ok) scoreboard = result.game
  }
  const closed = closeRound(scoreboard)
  if (closed.ok) scoreboard = closed.game

  return {
    ...state,
    scoreboard,
    revealed,
    phase: isGameFinished(scoreboard) ? 'finished' : 'round-ended',
    nextRoundReady: [],
  }
}

function markLayOffReady(state: DigitalChinchonState, playerId: string): DigitalResult {
  const closing = state.closing as DigitalClosing
  if (closing.closerId === playerId) return fail('is-closer')
  if (closing.ready.includes(playerId)) return fail('already-ready')
  const next = { ...state, closing: { ...closing, ready: [...closing.ready, playerId] } }
  const waiting = state.turnOrder.filter((id) => id !== closing.closerId && !next.closing.ready.includes(id))
  return { ok: true, state: waiting.length === 0 ? finishRound(next) : next }
}

/** El anfitrión inicia la siguiente ronda, o lo hacen dos no anfitriones (uno si solo hay uno). */
export function requiredNextRoundReady(state: Pick<DigitalChinchonState, 'seats' | 'hostId'>): number {
  return Math.min(2, state.seats.filter((seat) => seat.id !== state.hostId).length)
}

function beginNextRound(state: DigitalChinchonState, random: Random): DigitalResult {
  if (!canStartNextRound(state.scoreboard)) return fail('cannot-start-round')
  const started = startNextRound(state.scoreboard)
  if (!started.ok) return fail('cannot-start-round')
  const scoreboard = started.game
  const active = getActivePlayers(scoreboard).map((player) => player.id)
  return { ok: true, state: dealRound({ ...state, scoreboard }, nextActiveAfter(state.seats, active, state.starterId), random) }
}

export function applyDigitalAction(
  state: DigitalChinchonState,
  playerId: string,
  action: DigitalAction,
  random: Random = Math.random,
): DigitalResult {
  if (!state.seats.some((seat) => seat.id === playerId)) return fail('not-a-player')

  switch (action.type) {
    case 'draw-deck':
    case 'draw-discard':
    case 'discard':
    case 'close': {
      if (state.phase !== 'playing') return fail('invalid-phase')
      if (state.activePlayerId !== playerId) return fail('not-your-turn')
      if (action.type === 'draw-deck' || action.type === 'draw-discard') {
        if (state.hasDrawn) return fail('already-drawn')
        return action.type === 'draw-deck' ? drawFromDeck(state, playerId, random) : drawFromDiscard(state, playerId)
      }
      if (!state.hasDrawn) return fail('must-draw-first')
      return action.type === 'discard' ? discardCard(state, playerId, action.cardId) : closeWith(state, playerId, action.cardId)
    }
    case 'lay-off':
    case 'take-back':
    case 'lay-off-ready': {
      if (state.phase !== 'laying-off' || !state.closing) return fail('invalid-phase')
      if (!state.turnOrder.includes(playerId)) return fail('not-a-player')
      if (action.type === 'lay-off') return layOff(state, playerId, action.cardId, action.meldIndex)
      if (action.type === 'take-back') return takeBack(state, playerId, action.cardId)
      return markLayOffReady(state, playerId)
    }
    case 'rejoin': {
      if (state.phase !== 'round-ended') return fail('invalid-phase')
      if (!canRejoin(state.scoreboard, playerId)) return fail('rejoin-unavailable')
      const result = rejoinPlayer(state.scoreboard, playerId)
      return result.ok ? { ok: true, state: { ...state, scoreboard: result.game } } : fail('rejoin-unavailable')
    }
    case 'start-next-round': {
      if (state.phase !== 'round-ended') return fail('invalid-phase')
      if (playerId !== state.hostId) return fail('not-host')
      return beginNextRound(state, random)
    }
    case 'ready-next-round': {
      if (state.phase !== 'round-ended') return fail('invalid-phase')
      if (playerId === state.hostId) return fail('host-cannot-ready')
      if (state.nextRoundReady.includes(playerId)) return fail('already-ready')
      const nextRoundReady = [...state.nextRoundReady, playerId]
      if (nextRoundReady.length >= requiredNextRoundReady(state)) return beginNextRound({ ...state, nextRoundReady }, random)
      return { ok: true, state: { ...state, nextRoundReady } }
    }
  }
}

export function publicView(state: DigitalChinchonState): DigitalPublicView {
  return {
    seats: state.seats,
    hostId: state.hostId,
    scoreboard: state.scoreboard,
    phase: state.phase,
    turnOrder: state.turnOrder,
    activePlayerId: state.activePlayerId,
    hasDrawn: state.hasDrawn,
    deckCount: state.deck.length,
    discardTop: state.discard[state.discard.length - 1] ?? null,
    handCounts: Object.fromEntries(Object.entries(state.hands).map(([id, hand]) => [id, hand.length])),
    closing: state.closing
      ? {
          closerId: state.closing.closerId,
          melds: closingMelds(state.closing),
          layOffs: state.closing.layOffs,
          ready: state.closing.ready,
        }
      : null,
    revealed: state.revealed,
    nextRoundReady: state.nextRoundReady,
  }
}

/** Mano privada de cada jugador, para guardarla con acceso restringido a su dueño. */
export function privateHands(state: DigitalChinchonState): Record<string, ChinchonCard[]> {
  return Object.fromEntries(state.seats.map((seat) => [seat.id, state.hands[seat.id] ?? []]))
}

/** Datos del evento sin información oculta (la carta con la que se cierra queda boca abajo). */
export function publicEventData(action: DigitalAction): Record<string, unknown> {
  return action.type === 'close' ? { type: action.type } : { ...action }
}
