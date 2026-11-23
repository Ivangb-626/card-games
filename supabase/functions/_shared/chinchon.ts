// Reglas de cartas de Chinchón. Sin dependencias: se comparte tal cual con la Edge Function.

export type SpanishSuit = 'oros' | 'copas' | 'espadas' | 'bastos'

export type ChinchonCard = {
  id: string
  suit: SpanishSuit | 'comodin'
  /** 1–7, 10 (sota), 11 (caballo), 12 (rey); 0 en los comodines. */
  rank: number
}

export type HandArrangement = {
  melds: ChinchonCard[][]
  loose: ChinchonCard[]
  points: number
}

export const SPANISH_SUITS: SpanishSuit[] = ['oros', 'copas', 'espadas', 'bastos']
/** En la baraja de 40 cartas el 7 y la sota van seguidos. */
export const RANK_ORDER = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
export const JOKER_COUNT = 2
export const JOKER_POINTS = 25
export const HAND_SIZE = 7
export const MAX_CLOSING_LOOSE_POINTS = 5
export const CLOSE_BONUS = -10
export const CHINCHON_BONUS = -50

export function createSpanishDeck(): ChinchonCard[] {
  const cards = SPANISH_SUITS.flatMap((suit) => RANK_ORDER.map((rank) => ({ id: `${suit}-${rank}`, suit, rank })))
  const jokers = Array.from({ length: JOKER_COUNT }, (_, index) => ({ id: `comodin-${index + 1}`, suit: 'comodin' as const, rank: 0 }))
  return [...cards, ...jokers]
}

export function shuffleCards<T>(cards: T[], random: () => number = Math.random): T[] {
  const shuffled = [...cards]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function isJoker(card: ChinchonCard): boolean {
  return card.suit === 'comodin'
}

export function cardPoints(card: ChinchonCard): number {
  if (isJoker(card)) return JOKER_POINTS
  return card.rank >= 10 ? 10 : card.rank
}

function rankPosition(card: ChinchonCard): number {
  return RANK_ORDER.indexOf(card.rank)
}

/**
 * Combinación válida: 3 o más cartas, como mucho un comodín y al menos dos cartas reales.
 * Grupo: mismo número (máximo 4 cartas). Escalera: mismo palo y seguidas; el comodín cubre un hueco o un extremo.
 */
export function isValidMeld(cards: ChinchonCard[]): boolean {
  if (cards.length < 3) return false
  const jokers = cards.filter(isJoker).length
  const real = cards.filter((card) => !isJoker(card))
  if (jokers > 1 || real.length < 2) return false

  if (real.every((card) => card.rank === real[0].rank)) {
    return cards.length <= SPANISH_SUITS.length && new Set(real.map((card) => card.suit)).size === real.length
  }

  if (!real.every((card) => card.suit === real[0].suit)) return false
  const positions = real.map(rankPosition).sort((first, second) => first - second)
  if (new Set(positions).size !== positions.length) return false
  const span = positions[positions.length - 1] - positions[0] + 1
  return span - real.length <= jokers && cards.length <= RANK_ORDER.length
}

function sumPoints(cards: ChinchonCard[]): number {
  return cards.reduce((total, card) => total + cardPoints(card), 0)
}

function combinationsOf(items: ChinchonCard[], size: number): ChinchonCard[][] {
  if (size === 0) return [[]]
  if (size > items.length) return []
  const [first, ...rest] = items
  return [
    ...combinationsOf(rest, size - 1).map((combination) => [first, ...combination]),
    ...combinationsOf(rest, size),
  ]
}

/**
 * Recorre todas las formas de repartir la mano en combinaciones y cartas sueltas
 * y devuelve la de menos puntos sueltos (a igualdad, la de menos cartas sueltas)
 * entre las que cumplen `accept`.
 */
function searchArrangement(
  hand: ChinchonCard[],
  accept: (loose: ChinchonCard[]) => boolean,
): HandArrangement | null {
  let best: HandArrangement | null = null

  const visit = (remaining: ChinchonCard[], melds: ChinchonCard[][], loose: ChinchonCard[]) => {
    if (remaining.length === 0) {
      if (!accept(loose)) return
      const points = sumPoints(loose)
      if (!best || points < best.points || (points === best.points && loose.length < best.loose.length)) {
        best = { melds: melds.map((meld) => [...meld]), loose: [...loose], points }
      }
      return
    }

    const [first, ...rest] = remaining
    visit(rest, melds, [...loose, first])
    for (let size = 2; size <= rest.length; size += 1) {
      for (const others of combinationsOf(rest, size)) {
        const meld = [first, ...others]
        if (!isValidMeld(meld)) continue
        const used = new Set(others.map((card) => card.id))
        visit(rest.filter((card) => !used.has(card.id)), [...melds, meld], loose)
      }
    }
  }

  visit(hand, [], [])
  return best
}

export function bestArrangement(hand: ChinchonCard[]): HandArrangement {
  return searchArrangement(hand, () => true) ?? { melds: [], loose: [...hand], points: sumPoints(hand) }
}

export function minimumUnmatchedPoints(hand: ChinchonCard[]): number {
  return bestArrangement(hand).points
}

/** Cierre válido: como mucho una carta suelta, que no sea comodín y valga 5 o menos. */
export function closingArrangement(hand: ChinchonCard[]): HandArrangement | null {
  return searchArrangement(hand, (loose) =>
    loose.length === 0
    || (loose.length === 1 && !isJoker(loose[0]) && cardPoints(loose[0]) <= MAX_CLOSING_LOOSE_POINTS))
}

/** Chinchón: las 7 cartas seguidas del mismo palo, sin comodín. */
export function isChinchon(hand: ChinchonCard[]): boolean {
  if (hand.length !== HAND_SIZE || hand.some(isJoker)) return false
  if (!hand.every((card) => card.suit === hand[0].suit)) return false
  const positions = hand.map(rankPosition).sort((first, second) => first - second)
  return positions.every((position, index) => index === 0 || position === positions[index - 1] + 1)
}

/** Puntos de quien cierra: -50 con chinchón, -10 sin cartas sueltas o el valor de su carta suelta. */
export function closingPoints(hand: ChinchonCard[], arrangement: HandArrangement): number {
  if (isChinchon(hand)) return CHINCHON_BONUS
  return arrangement.loose.length === 0 ? CLOSE_BONUS : arrangement.points
}

/**
 * Combinación ya colocada en la mesa: el comodín ocupa una posición fija.
 * En las escaleras, `low` y `high` son posiciones de RANK_ORDER.
 */
export type PlacedMeld =
  | { kind: 'group'; rank: number; cards: ChinchonCard[] }
  | { kind: 'run'; suit: SpanishSuit; low: number; high: number; cards: ChinchonCard[] }

/** Extremo de la escalera que ocupa un comodín que no tapa ningún hueco. */
export type JokerEnd = 'low' | 'high'

function runBounds(real: ChinchonCard[]): { low: number; high: number } {
  const positions = real.map(rankPosition)
  return { low: Math.min(...positions), high: Math.max(...positions) }
}

/** Extremos posibles para el comodín sobrante de una escalera (vacío si no hay que elegir). */
export function jokerEndOptions(cards: ChinchonCard[]): JokerEnd[] {
  if (!isValidMeld(cards) || !cards.some(isJoker)) return []
  const real = cards.filter((card) => !isJoker(card))
  if (real.every((card) => card.rank === real[0].rank)) return []
  const { low, high } = runBounds(real)
  if (high - low + 1 > real.length) return []
  return [low > 0 ? 'low' as const : null, high < RANK_ORDER.length - 1 ? 'high' as const : null]
    .filter((end): end is JokerEnd => end !== null)
}

export function placeMeld(cards: ChinchonCard[], jokerEnd: JokerEnd = 'low'): PlacedMeld | null {
  if (!isValidMeld(cards)) return null
  const real = cards.filter((card) => !isJoker(card))
  if (real.every((card) => card.rank === real[0].rank)) return { kind: 'group', rank: real[0].rank, cards: [...cards] }

  let { low, high } = runBounds(real)
  const options = jokerEndOptions(cards)
  if (options.length > 0) {
    const end = options.includes(jokerEnd) ? jokerEnd : options[0]
    if (end === 'low') low -= 1
    else high += 1
  }
  return { kind: 'run', suit: real[0].suit as SpanishSuit, low, high, cards: [...cards] }
}

/** Liga una carta a una combinación colocada respetando la posición del comodín; null si no encaja. */
export function extendMeld(meld: PlacedMeld, card: ChinchonCard): PlacedMeld | null {
  const hasJoker = meld.cards.some(isJoker)
  if (meld.kind === 'group') {
    if (meld.cards.length >= SPANISH_SUITS.length) return null
    if (isJoker(card)) return hasJoker ? null : { ...meld, cards: [...meld.cards, card] }
    if (card.rank !== meld.rank || meld.cards.some((other) => other.suit === card.suit)) return null
    return { ...meld, cards: [...meld.cards, card] }
  }

  if (isJoker(card)) {
    if (hasJoker) return null
    if (meld.high < RANK_ORDER.length - 1) return { ...meld, high: meld.high + 1, cards: [...meld.cards, card] }
    if (meld.low > 0) return { ...meld, low: meld.low - 1, cards: [...meld.cards, card] }
    return null
  }
  if (card.suit !== meld.suit) return null
  const position = rankPosition(card)
  if (position === meld.low - 1) return { ...meld, low: position, cards: [...meld.cards, card] }
  if (position === meld.high + 1) return { ...meld, high: position, cards: [...meld.cards, card] }
  return null
}

/** Cartas en orden de mesa; `as` es el número que representa el comodín. */
export function orderedMeldCards(meld: PlacedMeld): { card: ChinchonCard; as: number | null }[] {
  const joker = meld.cards.find(isJoker) ?? null
  if (meld.kind === 'group') {
    const real = meld.cards.filter((card) => !isJoker(card)).map((card) => ({ card, as: null }))
    return joker ? [...real, { card: joker, as: meld.rank }] : real
  }
  const bySlot = new Map(meld.cards.filter((card) => !isJoker(card)).map((card) => [rankPosition(card), card]))
  const ordered: { card: ChinchonCard; as: number | null }[] = []
  for (let position = meld.low; position <= meld.high; position += 1) {
    const card = bySlot.get(position)
    if (card) ordered.push({ card, as: null })
    else if (joker) ordered.push({ card: joker, as: RANK_ORDER[position] })
  }
  return ordered
}

/** Número que representaría el comodín al colocar la escalera por un extremo concreto. */
export function jokerRankForEnd(cards: ChinchonCard[], end: JokerEnd): number | null {
  const placed = placeMeld(cards, end)
  if (!placed) return null
  return orderedMeldCards(placed).find((item) => item.as !== null)?.as ?? null
}

const RANK_LABELS: Record<number, string> = { 10: 'S', 11: 'C', 12: 'R' }

export function rankLabel(card: ChinchonCard): string {
  if (isJoker(card)) return '★'
  return RANK_LABELS[card.rank] ?? String(card.rank)
}

/** Orden de presentación: por palo y número, comodines al final. */
export function sortCards(cards: ChinchonCard[]): ChinchonCard[] {
  const suitOrder = (card: ChinchonCard) => isJoker(card) ? SPANISH_SUITS.length : SPANISH_SUITS.indexOf(card.suit as SpanishSuit)
  return [...cards].sort((first, second) => suitOrder(first) - suitOrder(second) || rankPosition(first) - rankPosition(second))
}
