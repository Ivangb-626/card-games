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

export function canLayOff(meld: ChinchonCard[], card: ChinchonCard): boolean {
  return isValidMeld([...meld, card])
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
