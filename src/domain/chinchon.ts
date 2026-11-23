export type SpanishSuit = 'oros' | 'copas' | 'espadas' | 'bastos'

export type ChinchonCard = {
  id: string
  suit: SpanishSuit
  rank: number
}

export type ChinchonPlayer = {
  id: string
  name: string
  hand: ChinchonCard[]
  score: number
}

export type ChinchonRound = {
  players: ChinchonPlayer[]
  activePlayerIndex: number
  deck: ChinchonCard[]
  discard: ChinchonCard[]
  hasDrawn: boolean
  roundNumber: number
  status: 'playing' | 'closed'
  winnerId: string | null
}

export type ChinchonActionResult =
  | { ok: true; round: ChinchonRound }
  | { ok: false; error: 'invalid-player' | 'invalid-turn' | 'invalid-card' | 'cannot-close' | 'deck-empty' }

const suits: SpanishSuit[] = ['oros', 'copas', 'espadas', 'bastos']

export function createSpanishDeck(): ChinchonCard[] {
  return suits.flatMap((suit) =>
    [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
    })),
  )
}

export function shuffleCards(cards: ChinchonCard[], random: () => number = Math.random): ChinchonCard[] {
  const shuffled = [...cards]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function createChinchonRound(playerIdsAndNames: Array<{ id: string; name: string }>, roundNumber = 1): ChinchonRound {
  const deck = shuffleCards(createSpanishDeck())
  const players = playerIdsAndNames.map((player) => ({
    id: player.id,
    name: player.name,
    hand: [] as ChinchonCard[],
    score: 0,
  }))
  for (let dealt = 0; dealt < 7; dealt += 1) {
    for (const player of players) {
      const card = deck.shift()
      if (card) player.hand.push(card)
    }
  }
  const firstDiscard = deck.shift()
  return {
    players,
    activePlayerIndex: 0,
    deck,
    discard: firstDiscard ? [firstDiscard] : [],
    hasDrawn: false,
    roundNumber,
    status: 'playing',
    winnerId: null,
  }
}

function cardPoints(card: ChinchonCard): number {
  return card.rank >= 10 ? 10 : card.rank
}

function cardKey(card: ChinchonCard): string {
  return card.id
}

function isValidMeld(cards: ChinchonCard[]): boolean {
  if (cards.length < 3) return false
  if (cards.every((card) => card.rank === cards[0].rank)) return true
  if (!cards.every((card) => card.suit === cards[0].suit)) return false
  const ranks = [...new Set(cards.map((card) => card.rank))].sort((a, b) => a - b)
  if (ranks.length !== cards.length) return false
  return ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1)
}

function combinations(items: ChinchonCard[], size: number): ChinchonCard[][] {
  if (size === 0) return [[]]
  if (size > items.length) return []
  const result: ChinchonCard[][] = []
  const visit = (start: number, chosen: ChinchonCard[]) => {
    if (chosen.length === size) {
      result.push([...chosen])
      return
    }
    for (let index = start; index <= items.length - (size - chosen.length); index += 1) {
      chosen.push(items[index])
      visit(index + 1, chosen)
      chosen.pop()
    }
  }
  visit(0, [])
  return result
}

export function minimumUnmatchedPoints(hand: ChinchonCard[]): number {
  const best = { value: hand.reduce((sum, card) => sum + cardPoints(card), 0) }
  const search = (remaining: ChinchonCard[], unmatchedPoints: number) => {
    if (unmatchedPoints >= best.value) return
    if (remaining.length === 0) {
      best.value = unmatchedPoints
      return
    }

    const first = remaining[0]
    search(remaining.slice(1), unmatchedPoints + cardPoints(first))
    for (let size = 3; size <= remaining.length; size += 1) {
      for (const meld of combinations(remaining, size)) {
        if (!isValidMeld(meld)) continue
        const meldKeys = new Set(meld.map(cardKey))
        search(remaining.filter((card) => !meldKeys.has(cardKey(card))), unmatchedPoints)
      }
    }
  }
  search(hand, 0)
  return best.value
}

export function canCloseChinchon(hand: ChinchonCard[]): boolean {
  return minimumUnmatchedPoints(hand) <= 5
}

export function drawFromDeck(round: ChinchonRound, playerId: string): ChinchonActionResult {
  const active = round.players[round.activePlayerIndex]
  if (!active || active.id !== playerId) return { ok: false, error: 'invalid-turn' }
  if (round.hasDrawn) return { ok: false, error: 'invalid-turn' }
  if (round.deck.length === 0) {
    if (round.discard.length <= 1) return { ok: false, error: 'deck-empty' }
    const last = round.discard[round.discard.length - 1]
    const recycledDeck = shuffleCards(round.discard.slice(0, -1))
    if (recycledDeck.length === 0) return { ok: false, error: 'deck-empty' }
    const card = recycledDeck[0]
    return {
      ok: true,
      round: {
        ...round,
        deck: recycledDeck.slice(1),
        discard: [last],
        hasDrawn: true,
        players: round.players.map((player) =>
          player.id === playerId ? { ...player, hand: [...player.hand, card] } : player,
        ),
      },
    }
  }
  const card = round.deck[0]
  return {
    ok: true,
    round: {
      ...round,
      deck: round.deck.slice(1),
      hasDrawn: true,
      players: round.players.map((player) =>
        player.id === playerId ? { ...player, hand: [...player.hand, card] } : player,
      ),
    },
  }
}

export function drawFromDiscard(round: ChinchonRound, playerId: string): ChinchonActionResult {
  const active = round.players[round.activePlayerIndex]
  if (!active || active.id !== playerId) return { ok: false, error: 'invalid-turn' }
  if (round.hasDrawn) return { ok: false, error: 'invalid-turn' }
  if (round.discard.length === 0) return { ok: false, error: 'invalid-card' }
  const card = round.discard[round.discard.length - 1]
  return {
    ok: true,
    round: {
      ...round,
      discard: round.discard.slice(0, -1),
      hasDrawn: true,
      players: round.players.map((player) =>
        player.id === playerId ? { ...player, hand: [...player.hand, card] } : player,
      ),
    },
  }
}

export function discardCard(round: ChinchonRound, playerId: string, cardId: string): ChinchonActionResult {
  const active = round.players[round.activePlayerIndex]
  if (!active || active.id !== playerId) return { ok: false, error: 'invalid-turn' }
  if (!round.hasDrawn) return { ok: false, error: 'invalid-turn' }
  const card = active.hand.find((candidate) => candidate.id === cardId)
  if (!card) return { ok: false, error: 'invalid-card' }
  const nextIndex = (round.activePlayerIndex + 1) % round.players.length
  return {
    ok: true,
    round: {
      ...round,
      activePlayerIndex: nextIndex,
      hasDrawn: false,
      discard: [...round.discard, card],
      players: round.players.map((player) =>
        player.id === playerId ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== cardId) } : player,
      ),
    },
  }
}

export function closeChinchon(round: ChinchonRound, playerId: string): ChinchonActionResult {
  const active = round.players[round.activePlayerIndex]
  if (!active || active.id !== playerId) return { ok: false, error: 'invalid-turn' }
  if (!canCloseChinchon(active.hand)) return { ok: false, error: 'cannot-close' }
  const unmatched = minimumUnmatchedPoints(active.hand)
  const isNatural = active.hand.every((card) => card.suit === active.hand[0].suit)
    && [...active.hand.map((card) => card.rank)].sort((a, b) => a - b).every((rank, index, ranks) => index === 0 || rank === ranks[index - 1] + 1)
  const players = round.players.map((player) => {
    if (player.id === playerId) {
      const playerScore = isNatural ? -50 : unmatched === 0 ? -10 : unmatched
      return { ...player, score: player.score + playerScore }
    }
    return { ...player, score: player.score + minimumUnmatchedPoints(player.hand) }
  })
  return {
    ok: true,
    round: {
      ...round,
      players,
      status: 'closed',
      winnerId: playerId,
    },
  }
}
