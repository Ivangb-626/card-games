export type DeckKind = 'spanish' | 'american'

export type DemoCard = {
  id: string
  value: string
  suit: string
  suitSymbol: string
  accent: 'warm' | 'cool' | 'neutral'
  label: string
}

export const spanishCards: DemoCard[] = [
  { id: 'sp-1-oros', value: '1', suit: 'Oros', suitSymbol: '✦', accent: 'warm', label: 'As de oros' },
  { id: 'sp-7-copas', value: '7', suit: 'Copas', suitSymbol: '♥', accent: 'warm', label: 'Siete de copas' },
  { id: 'sp-sota-bastos', value: 'S', suit: 'Bastos', suitSymbol: '♣', accent: 'cool', label: 'Sota de bastos' },
  { id: 'sp-rey-espadas', value: 'R', suit: 'Espadas', suitSymbol: '♠', accent: 'cool', label: 'Rey de espadas' },
]

export const americanCards: DemoCard[] = [
  { id: 'us-a-hearts', value: 'A', suit: 'Hearts', suitSymbol: '♥', accent: 'warm', label: 'Ace of hearts' },
  { id: 'us-10-diamonds', value: '10', suit: 'Diamonds', suitSymbol: '♦', accent: 'warm', label: 'Ten of diamonds' },
  { id: 'us-q-clubs', value: 'Q', suit: 'Clubs', suitSymbol: '♣', accent: 'cool', label: 'Queen of clubs' },
  { id: 'us-k-spades', value: 'K', suit: 'Spades', suitSymbol: '♠', accent: 'cool', label: 'King of spades' },
]
