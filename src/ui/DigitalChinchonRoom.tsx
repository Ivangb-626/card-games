import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  bestArrangement,
  canLayOff,
  closingArrangement,
  sortCards,
  rankLabel,
  type ChinchonCard,
} from '../domain/chinchon'
import { requiredNextRoundReady, type DigitalRevealedHand } from '../domain/digitalChinchon'
import { canRejoin, getLowestScorePlayers, getRejoinScore, getWinners, isPlayerEliminated } from '../domain/physicalGame'
import type { DigitalRoom } from '../domain/room'
import {
  loadGameSnapshot,
  sendGameAction,
  subscribeToGame,
  type GameAction,
  type GameSnapshot,
} from '../infrastructure/supabase/gameRepository'

type Language = 'es' | 'en'

const GAME_REFRESH_MS = 4000

const SUIT_SYMBOLS: Record<ChinchonCard['suit'], string> = { oros: '●', copas: '♥', espadas: '⚔', bastos: '♣', comodin: '★' }
const RANK_NAMES: Record<Language, Record<number, string>> = {
  es: { 1: 'As', 10: 'Sota', 11: 'Caballo', 12: 'Rey' },
  en: { 1: 'Ace', 10: 'Jack', 11: 'Knight', 12: 'King' },
}

const copy = {
  es: {
    room: (code: string) => `Sala ${code}`,
    shareCode: 'Comparte este código para que se unan. La sala admite de 2 a 4 jugadores.',
    players: 'Jugadores de la sala',
    host: 'Anfitrión',
    you: 'Tú',
    startGame: 'Empezar partida',
    needPlayers: 'Hacen falta al menos 2 jugadores para empezar.',
    waitingHost: 'Esperando a que el anfitrión empiece la partida…',
    leave: 'Salir de la sala',
    loading: 'Cargando la partida…',
    round: (round: number) => `Ronda ${round}`,
    roundColumn: 'Ronda',
    deck: (count: number) => `Mazo · ${count}`,
    drawDeck: 'Robar del mazo',
    drawDiscard: 'Coger del descarte',
    emptyDiscard: 'Descarte vacío',
    yourTurnDraw: 'Tu turno: roba del mazo o coge la carta del descarte.',
    yourTurnDiscard: 'Elige una carta para descartar o cerrar.',
    turnOf: (name: string) => `Turno de ${name}.`,
    yourHand: 'Tu mano',
    looseLabel: (points: number) => `Puntos sueltos: ${points}`,
    discard: 'Descartar',
    close: 'Cerrar con esta carta',
    closeHint: 'Para cerrar, la carta elegida se aparta y con las otras 7 solo puede quedar una carta suelta de 5 o menos.',
    cards: (count: number) => count === 1 ? '1 carta' : `${count} cartas`,
    out: 'Fuera',
    closedBy: (name: string) => `${name} ha cerrado. Coloca tus cartas sueltas en sus combinaciones y pulsa «Listo».`,
    closerWaiting: 'Has cerrado. Los demás están ligando sus cartas.',
    layOffHere: 'Ligar aquí',
    takeBack: (label: string) => `Devolver ${label} a tu mano`,
    ready: 'Listo',
    readyDone: 'Listo. Esperando al resto…',
    waitingFor: (names: string[]) => `Esperando a: ${names.join(', ')}`,
    roundResults: (round: number) => `Resultado de la ronda ${round}`,
    closingCard: 'Carta apartada al cerrar',
    laidOff: 'Ligadas',
    loose: 'Sueltas',
    roundPoints: (points: number) => `${points > 0 ? '+' : ''}${points} puntos`,
    scoreboard: 'Marcador',
    total: 'Total',
    rejoins: 'Reenganches',
    rejoin: (score: number) => `Reengancharme con ${score}`,
    startNextRound: (round: number) => `Empezar ronda ${round}`,
    readyNextRound: 'Listo para la siguiente ronda',
    nextRoundReady: (count: number, required: number) => `Listos: ${count} de ${required}. El anfitrión también puede empezarla.`,
    waitingNextRound: 'Esperando a que empiece la siguiente ronda…',
    eliminatedWait: 'Estás fuera: no juegas esta ronda.',
    finished: 'Fin de la partida',
    winner: (names: string[]) => `${names.length === 1 ? 'Gana' : 'Ganan'} ${names.join(' y ')}.`,
    lowest: (names: string[]) => `Sin ganador. Menos puntos: ${names.join(' y ')}.`,
    errors: {
      'not-your-turn': 'No es tu turno.',
      'already-drawn': 'Ya has robado en este turno.',
      'must-draw-first': 'Primero tienes que robar una carta.',
      'deck-empty': 'No quedan cartas para robar.',
      'card-not-in-hand': 'Esa carta no está en tu mano.',
      'cannot-close': 'No puedes cerrar con esa carta.',
      'cannot-lay-off': 'Esa carta no encaja en esa combinación.',
      'invalid-meld': 'No puedes devolver esa carta: otra carta ligada depende de ella.',
      'already-ready': 'Ya has marcado «Listo».',
      'not-host': 'Solo el anfitrión puede hacer eso.',
      'version-conflict': 'La mesa ha cambiado mientras jugabas. Vuelve a intentarlo.',
      'not-configured': 'Supabase no está configurado en este entorno.',
      network: 'No se pudo contactar con el servidor. Comprueba la conexión.',
      default: 'No se pudo completar la jugada.',
    } as Record<string, string>,
  },
  en: {
    room: (code: string) => `Room ${code}`,
    shareCode: 'Share this code so others can join. Rooms take 2 to 4 players.',
    players: 'Players in the room',
    host: 'Host',
    you: 'You',
    startGame: 'Start game',
    needPlayers: 'At least 2 players are needed to start.',
    waitingHost: 'Waiting for the host to start the game…',
    leave: 'Leave room',
    loading: 'Loading the game…',
    round: (round: number) => `Round ${round}`,
    roundColumn: 'Round',
    deck: (count: number) => `Deck · ${count}`,
    drawDeck: 'Draw from deck',
    drawDiscard: 'Take the discard',
    emptyDiscard: 'Empty discard',
    yourTurnDraw: 'Your turn: draw from the deck or take the discard.',
    yourTurnDiscard: 'Choose a card to discard or to close with.',
    turnOf: (name: string) => `${name}'s turn.`,
    yourHand: 'Your hand',
    looseLabel: (points: number) => `Loose points: ${points}`,
    discard: 'Discard',
    close: 'Close with this card',
    closeHint: 'To close, the chosen card is set aside and the other 7 may leave at most one loose card worth 5 or less.',
    cards: (count: number) => count === 1 ? '1 card' : `${count} cards`,
    out: 'Out',
    closedBy: (name: string) => `${name} has closed. Lay your loose cards on their melds and press "Ready".`,
    closerWaiting: 'You closed. The others are laying off their cards.',
    layOffHere: 'Lay off here',
    takeBack: (label: string) => `Take ${label} back`,
    ready: 'Ready',
    readyDone: 'Ready. Waiting for the others…',
    waitingFor: (names: string[]) => `Waiting for: ${names.join(', ')}`,
    roundResults: (round: number) => `Round ${round} results`,
    closingCard: 'Card set aside to close',
    laidOff: 'Laid off',
    loose: 'Loose',
    roundPoints: (points: number) => `${points > 0 ? '+' : ''}${points} points`,
    scoreboard: 'Scoreboard',
    total: 'Total',
    rejoins: 'Rejoins',
    rejoin: (score: number) => `Rejoin at ${score}`,
    startNextRound: (round: number) => `Start round ${round}`,
    readyNextRound: 'Ready for the next round',
    nextRoundReady: (count: number, required: number) => `Ready: ${count} of ${required}. The host can also start it.`,
    waitingNextRound: 'Waiting for the next round to start…',
    eliminatedWait: 'You are out: you sit this round out.',
    finished: 'Game over',
    winner: (names: string[]) => `${names.join(' and ')} ${names.length === 1 ? 'wins' : 'win'}.`,
    lowest: (names: string[]) => `No winner. Fewest points: ${names.join(' and ')}.`,
    errors: {
      'not-your-turn': "It's not your turn.",
      'already-drawn': 'You have already drawn this turn.',
      'must-draw-first': 'Draw a card first.',
      'deck-empty': 'There are no cards left to draw.',
      'card-not-in-hand': 'That card is not in your hand.',
      'cannot-close': "You can't close with that card.",
      'cannot-lay-off': "That card doesn't fit that meld.",
      'invalid-meld': "You can't take that card back: another laid-off card depends on it.",
      'already-ready': 'You are already marked as ready.',
      'not-host': 'Only the host can do that.',
      'version-conflict': 'The table changed while you were playing. Try again.',
      'not-configured': 'Supabase is not configured here.',
      network: 'Could not reach the server. Check your connection.',
      default: 'That move could not be completed.',
    } as Record<string, string>,
  },
} as const

function cardName(card: ChinchonCard, language: Language): string {
  if (card.suit === 'comodin') return language === 'es' ? 'Comodín' : 'Joker'
  const rank = RANK_NAMES[language][card.rank] ?? String(card.rank)
  return language === 'es' ? `${rank} de ${card.suit}` : `${rank} of ${card.suit}`
}

type CardProps = {
  card: ChinchonCard
  language: Language
  selected?: boolean
  muted?: boolean
  onClick?: () => void
  disabled?: boolean
  label?: string
}

function CardFace({ card, language, selected, muted, onClick, disabled, label }: CardProps) {
  const className = `dc-card suit-${card.suit}${selected ? ' is-selected' : ''}${muted ? ' is-muted' : ''}`
  const content = (
    <>
      <span className="dc-card-rank">{rankLabel(card)}</span>
      <span className="dc-card-suit" aria-hidden="true">{SUIT_SYMBOLS[card.suit]}</span>
    </>
  )
  if (!onClick) return <span className={className} role="img" aria-label={label ?? cardName(card, language)}>{content}</span>
  return (
    <button className={className} type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} aria-label={label ?? cardName(card, language)}>
      {content}
    </button>
  )
}

type Props = {
  room: DigitalRoom
  memberId: string | null
  language: Language
  onLeave: () => void
}

export function DigitalChinchonRoom({ room, memberId, language, onLeave }: Props) {
  const t = copy[language]
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!memberId) return
    const next = await loadGameSnapshot(room.id, memberId)
    if (next) setSnapshot((current) => current && current.version > next.version ? current : next)
  }, [room.id, memberId])

  useEffect(() => {
    void reload()
    const unsubscribe = subscribeToGame(room.id, () => { void reload() })
    // Respaldo por si se pierde algún aviso de Realtime.
    const interval = window.setInterval(() => { void reload() }, GAME_REFRESH_MS)
    return () => {
      unsubscribe?.()
      window.clearInterval(interval)
    }
  }, [reload, room.id, room.status])

  const run = async (action: GameAction) => {
    setPending(true)
    const result = await sendGameAction(room.id, action)
    if (result.ok) {
      setError(null)
      setSelectedCardId(null)
    } else {
      setError(t.errors[result.error] ?? t.errors.default)
    }
    await reload()
    setPending(false)
  }

  const view = snapshot?.view ?? null
  const names = useMemo(() => Object.fromEntries(room.members.map((member) => [member.id, member.name])), [room.members])
  const nameOf = (id: string) => names[id] ?? view?.seats.find((seat) => seat.id === id)?.name ?? '?'
  const isHost = memberId !== null && memberId === room.hostMemberId

  const lobby = (
    <>
      <h1>{t.room(room.code)}</h1>
      <p>{t.shareCode}</p>
      <div className="room-members" aria-label={t.players}>
        {room.members.map((member) => (
          <article className="room-member" key={member.id}>
            <span className={`connection-dot ${member.connection}`} aria-hidden="true" />
            <strong>{member.name}{member.id === memberId ? ` (${t.you})` : ''}</strong>
            {member.isHost && <span className="host-badge">{t.host}</span>}
          </article>
        ))}
      </div>
      {isHost ? (
        <>
          {room.members.length < 2 && <p className="dc-hint">{t.needPlayers}</p>}
          <button className="button primary" type="button" onClick={() => void run({ type: 'start-game' })} disabled={pending || room.members.length < 2}>
            {t.startGame}
          </button>
        </>
      ) : (
        <p className="room-status" role="status">{t.waitingHost}</p>
      )}
    </>
  )

  if (!view) {
    return (
      <div className="digital-room-panel">
        <p className="eyebrow">02 · Chinchón</p>
        {room.status === 'waiting' ? lobby : <p role="status">{t.loading}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button secondary dc-leave" type="button" onClick={onLeave}>{t.leave}</button>
      </div>
    )
  }

  const me = memberId ?? ''
  const hand = snapshot?.hand ?? []
  const myLayOffs = view.closing?.layOffs.filter((item) => item.playerId === me) ?? []
  const laidIds = new Set(myLayOffs.map((item) => item.card.id))
  const availableHand = hand.filter((card) => !laidIds.has(card.id))
  const arrangement = bestArrangement(availableHand)
  const selectedCard = availableHand.find((card) => card.id === selectedCardId) ?? null
  const isMyTurn = view.phase === 'playing' && view.activePlayerId === me
  const canDraw = isMyTurn && !view.hasDrawn && !pending
  const canPlayCard = isMyTurn && view.hasDrawn && !pending
  const canCloseSelected = canPlayCard && selectedCard !== null
    && closingArrangement(availableHand.filter((card) => card.id !== selectedCard.id)) !== null
  const iAmCloser = view.closing?.closerId === me
  const iAmReady = view.closing?.ready.includes(me) ?? false
  const layingOff = view.phase === 'laying-off' && !iAmCloser && view.turnOrder.includes(me) && !iAmReady
  const iAmOut = isPlayerEliminated(view.scoreboard, me)
  const lastRound = view.scoreboard.rounds[view.scoreboard.rounds.length - 1]

  const toggleCard = (cardId: string) => setSelectedCardId((current) => current === cardId ? null : cardId)

  const statusText = view.phase === 'playing'
    ? isMyTurn ? (view.hasDrawn ? t.yourTurnDiscard : t.yourTurnDraw) : t.turnOf(nameOf(view.activePlayerId))
    : view.phase === 'laying-off' && view.closing
      ? iAmCloser ? t.closerWaiting : iAmReady ? t.readyDone : t.closedBy(nameOf(view.closing.closerId))
      : null

  const handGroups = [...arrangement.melds.map((meld) => ({ cards: sortCards(meld), loose: false })), { cards: sortCards(arrangement.loose), loose: true }]

  const renderRevealed = (revealed: DigitalRevealedHand) => (
    <article className="dc-revealed" key={revealed.playerId}>
      <header>
        <strong>{nameOf(revealed.playerId)}</strong>
        <span className="dc-points">{t.roundPoints(revealed.points)}</span>
      </header>
      <div className="dc-revealed-cards">
        {revealed.arrangement.melds.map((meld, index) => (
          <div className="dc-meld" key={index}>{sortCards(meld).map((card) => <CardFace key={card.id} card={card} language={language} />)}</div>
        ))}
        {revealed.laidOff.length > 0 && (
          <div className="dc-meld is-laid" aria-label={t.laidOff}>
            <span className="dc-group-label">{t.laidOff}</span>
            {revealed.laidOff.map((card) => <CardFace key={card.id} card={card} language={language} />)}
          </div>
        )}
        {revealed.arrangement.loose.length > 0 && (
          <div className="dc-meld is-loose" aria-label={t.loose}>
            <span className="dc-group-label">{t.loose}</span>
            {sortCards(revealed.arrangement.loose).map((card) => <CardFace key={card.id} card={card} language={language} />)}
          </div>
        )}
        {revealed.closingCard && (
          <div className="dc-meld is-closing" aria-label={t.closingCard}>
            <span className="dc-group-label">{t.closingCard}</span>
            <CardFace card={revealed.closingCard} language={language} />
          </div>
        )}
      </div>
    </article>
  )

  const betweenRounds = view.phase === 'round-ended' || view.phase === 'finished'
  const winners = getWinners(view.scoreboard)
  const required = requiredNextRoundReady({ seats: view.seats, hostId: view.hostId })
  const rejoinScore = getRejoinScore(view.scoreboard)

  return (
    <div className="digital-room-panel dc-table">
      <div className="dc-heading">
        <div>
          <p className="eyebrow">Chinchón · {t.room(room.code)}</p>
          <h1>{view.phase === 'finished' ? t.finished : t.round(view.scoreboard.round)}</h1>
        </div>
        <button className="button secondary" type="button" onClick={onLeave}>{t.leave}</button>
      </div>

      <ol className="dc-seats" aria-label={t.players}>
        {view.seats.map((seat) => {
          const out = isPlayerEliminated(view.scoreboard, seat.id)
          const active = view.phase === 'playing' && view.activePlayerId === seat.id
          return (
            <li key={seat.id} className={`dc-seat${active ? ' is-active' : ''}${out ? ' is-out' : ''}`} aria-current={active ? 'true' : undefined}>
              <strong>{seat.name}{seat.id === me ? ` (${t.you})` : ''}</strong>
              <span className="dc-seat-total">{view.scoreboard.scores[seat.id]}</span>
              <span className="dc-seat-meta">
                {seat.id === view.hostId && <span className="host-badge">{t.host}</span>}
                {out && <span className="score-badge out">{t.out}</span>}
                {!betweenRounds && view.handCounts[seat.id] !== undefined && !out && <span>{t.cards(view.handCounts[seat.id])}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      {statusText && <p className="dc-status" role="status">{statusText}</p>}

      {view.phase === 'playing' && (
        <section className="dc-piles">
          <button className="dc-pile dc-deck" type="button" onClick={() => void run({ type: 'draw-deck' })} disabled={!canDraw} aria-label={t.drawDeck}>
            <span aria-hidden="true">🂠</span>
            <span>{t.deck(view.deckCount)}</span>
          </button>
          {view.discardTop ? (
            <CardFace
              card={view.discardTop}
              language={language}
              onClick={() => void run({ type: 'draw-discard' })}
              disabled={!canDraw}
              label={`${t.drawDiscard}: ${cardName(view.discardTop, language)}`}
            />
          ) : <span className="dc-pile is-empty">{t.emptyDiscard}</span>}
        </section>
      )}

      {view.phase === 'laying-off' && view.closing && (
        <section className="dc-closer-melds" aria-label={t.closedBy(nameOf(view.closing.closerId))}>
          {view.closing.melds.map((meld, index) => {
            const fits = layingOff && selectedCard !== null && canLayOff(meld, selectedCard)
            return (
              <div className="dc-meld-row" key={index}>
                <div className="dc-meld">
                  {meld.map((card) => {
                    const mine = myLayOffs.some((item) => item.card.id === card.id)
                    return mine && layingOff
                      ? <CardFace key={card.id} card={card} language={language} onClick={() => void run({ type: 'take-back', cardId: card.id })} disabled={pending} label={t.takeBack(cardName(card, language))} selected />
                      : <CardFace key={card.id} card={card} language={language} />
                  })}
                </div>
                {layingOff && (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={!fits || pending}
                    onClick={() => selectedCard && void run({ type: 'lay-off', cardId: selectedCard.id, meldIndex: index })}
                  >{t.layOffHere}</button>
                )}
              </div>
            )
          })}
          <p className="dc-hint">
            {t.waitingFor(view.turnOrder.filter((id) => id !== view.closing?.closerId && !view.closing?.ready.includes(id)).map(nameOf))}
          </p>
        </section>
      )}

      {!betweenRounds && view.turnOrder.includes(me) && (
        <section className="dc-hand" aria-label={t.yourHand}>
          <div className="dc-hand-heading">
            <h2>{t.yourHand}</h2>
            <span>{t.looseLabel(arrangement.points)}</span>
          </div>
          <div className="dc-hand-cards">
            {handGroups.filter((group) => group.cards.length > 0).map((group, index) => (
              <div className={`dc-meld${group.loose ? ' is-loose' : ''}`} key={index}>
                {group.cards.map((card) => (
                  <CardFace
                    key={card.id}
                    card={card}
                    language={language}
                    selected={card.id === selectedCardId}
                    onClick={() => toggleCard(card.id)}
                    disabled={pending || (!canPlayCard && !layingOff)}
                  />
                ))}
              </div>
            ))}
          </div>
          {canPlayCard && (
            <div className="dc-actions">
              <button className="button primary" type="button" disabled={!selectedCard} onClick={() => selectedCard && void run({ type: 'discard', cardId: selectedCard.id })}>{t.discard}</button>
              <button className="button secondary" type="button" disabled={!canCloseSelected} onClick={() => selectedCard && void run({ type: 'close', cardId: selectedCard.id })}>{t.close}</button>
              <p className="dc-hint">{t.closeHint}</p>
            </div>
          )}
          {layingOff && (
            <div className="dc-actions">
              <button className="button primary" type="button" disabled={pending} onClick={() => void run({ type: 'lay-off-ready' })}>{t.ready}</button>
            </div>
          )}
        </section>
      )}

      {!betweenRounds && !view.turnOrder.includes(me) && iAmOut && <p className="dc-hint">{t.eliminatedWait}</p>}

      {betweenRounds && (
        <>
          {view.phase === 'finished' && (
            <p className="summary-winner" role="status">
              {winners.length > 0
                ? <><span aria-hidden="true">🏆</span> {t.winner(winners.map((player) => player.name))}</>
                : t.lowest(getLowestScorePlayers(view.scoreboard).map((player) => player.name))}
            </p>
          )}
          {view.revealed && lastRound && (
            <section className="dc-results" aria-label={t.roundResults(lastRound.round)}>
              <h2>{t.roundResults(lastRound.round)}</h2>
              {view.revealed.map(renderRevealed)}
            </section>
          )}
          <section aria-label={t.scoreboard}>
            <h2 className="summary-heading">{t.scoreboard}</h2>
            <div className="summary-table-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th scope="col">{t.roundColumn}</th>
                    {view.seats.map((seat) => <th scope="col" key={seat.id}>{seat.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {view.scoreboard.rounds.map((record) => (
                    <tr key={record.round}>
                      <th scope="row">{record.round}</th>
                      {view.seats.map((seat) => {
                        const points = record.points[seat.id] ?? null
                        return (
                          <td key={seat.id}>
                            <span className="summary-points">{points === null ? '—' : points > 0 ? `+${points}` : points}</span>
                            <span className="summary-total">{record.totals[seat.id]}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">{t.rejoins}</th>
                    {view.seats.map((seat) => <td key={seat.id}>{view.scoreboard.rejoins[seat.id] ?? 0}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          {view.phase === 'round-ended' && (
            <div className="dc-actions">
              {canRejoin(view.scoreboard, me) && rejoinScore !== null && (
                <button className="button primary" type="button" disabled={pending} onClick={() => void run({ type: 'rejoin' })}>{t.rejoin(rejoinScore)}</button>
              )}
              {me === view.hostId ? (
                <button className="button primary" type="button" disabled={pending} onClick={() => void run({ type: 'start-next-round' })}>
                  {t.startNextRound(view.scoreboard.round + 1)}
                </button>
              ) : view.nextRoundReady.includes(me) ? (
                <p className="dc-hint">{t.waitingNextRound}</p>
              ) : (
                <button className="button secondary" type="button" disabled={pending} onClick={() => void run({ type: 'ready-next-round' })}>{t.readyNextRound}</button>
              )}
              <p className="dc-hint">{t.nextRoundReady(view.nextRoundReady.length, required)}</p>
            </div>
          )}
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
