import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent, WheelEvent } from 'react'
import { americanCards, DemoCard, DeckKind, spanishCards } from './cards'
import { adjustPlayerScore, createPhysicalGame, PhysicalGame, SetupError } from './domain/physicalGame'
import { loadPhysicalGame, savePhysicalGame } from './infrastructure/storage/physicalGameStorage'

type Language = 'es' | 'en'
type View = 'home' | 'physical' | 'digital' | 'gallery'

const copy = {
  es: {
    nav: ['Inicio', 'Modo físico', 'Modo digital', 'Galería'],
    navLabel: 'Navegación principal',
    eyebrow: 'MESA ABIERTA · MVP VISUAL',
    title: 'Tus cartas, tu mesa, tu ritmo.',
    intro: 'Una base clara para jugar con cartas físicas hoy y preparar partidas digitales privadas mañana.',
    primary: 'Explorar la galería',
    secondary: 'Ver modos de juego',
    physical: 'Modo físico',
    physicalText: 'Lleva la puntuación de una partida presencial, incluso sin red.',
    digital: 'Modo digital',
    digitalText: 'Prepara una sala privada por invitación.',
    gallery: 'Galería de cartas',
    galleryText: 'Conoce la baraja antes de empezar.',
    featured: 'Estados de la mesa',
    featuredText: 'Diseñamos la experiencia alrededor de un estado visible y fácil de corregir.',
    lobby: 'Esperando jugadores',
    lobbyText: 'Sala lista · código 4K7M',
    turn: 'Turno propio',
    turnText: 'Tus acciones principales siempre están a mano.',
    reconnect: 'Reconexión',
    reconnectText: 'El asiento y el progreso se conservan.',
    spanish: 'Baraja española',
    american: 'Baraja americana',
    all: 'Todas',
    demo: 'Demostración visual',
    demoText: 'Estas cartas son datos de muestra; las reglas llegarán en una fase posterior.',
    back: 'Volver al inicio',
    open: 'Abrir',
    demoStatus: 'Demo visual',
    ready: 'Preparado',
    demoValue: 'Muestra',
    safe: 'Demo',
    homeLabel: 'Card Games, inicio',
    note: 'Diseñado para una acción clara por contexto.',
    languageLabel: 'Idioma',
    filterLabel: 'Filtrar baraja',
    modesLabel: 'Modos disponibles',
    heroCardsLabel: 'Cartas de demostración',
    cups: 'Copas',
    spades: 'Espadas',
    setupTitle: 'Configura la partida',
    setupIntro: 'Añade de 2 a 4 jugadores para crear sus contadores de puntuación.',
    playerName: (number: number) => `Nombre del jugador ${number}`,
    addPlayer: 'Añadir jugador',
    removePlayer: 'Quitar',
    startGame: 'Iniciar partida',
    playerCountError: 'La partida necesita entre 2 y 4 jugadores.',
    emptyNameError: 'Escribe un nombre para cada jugador.',
    duplicateNameError: 'Cada jugador debe tener un nombre distinto.',
    scoresTitle: 'Marcador de Chinchón',
    scoreLabel: 'puntos',
    scoreNote: 'Usa − o +, la rueda del ratón o desliza arriba y abajo sobre el marcador.',
    decreaseScore: (name: string) => `Restar un punto a ${name}`,
    increaseScore: (name: string) => `Sumar un punto a ${name}`,
    invalidAdjustment: 'No se pudo ajustar esta puntuación.',
    missingScorePlayer: 'No se encontró ese jugador en la partida.',
    storageLoading: 'Recuperando la partida guardada…',
    storageSaved: 'Partida guardada en este dispositivo.',
    storageUnavailable: 'No se puede acceder al almacenamiento local. La partida solo estará disponible mientras esta pestaña permanezca abierta.',
    storageInvalid: 'El guardado local no se puede leer. Inicia una partida nueva para sustituirlo.',
    storageSaveError: 'No se pudo guardar la partida. Seguirá disponible en esta pestaña.',
    footer: 'Responsive · teclado · contraste AA',
  },
  en: {
    nav: ['Home', 'Physical mode', 'Digital mode', 'Gallery'],
    navLabel: 'Main navigation',
    eyebrow: 'OPEN TABLE · VISUAL MVP',
    title: 'Your cards, your table, your pace.',
    intro: 'A clear foundation for playing with physical cards today and preparing private digital games tomorrow.',
    primary: 'Explore the gallery',
    secondary: 'View game modes',
    physical: 'Physical mode',
    physicalText: 'Keep score for an in-person game, even offline.',
    digital: 'Digital mode',
    digitalText: 'Prepare a private invite-only room.',
    gallery: 'Card gallery',
    galleryText: 'Meet the deck before you start.',
    featured: 'Table states',
    featuredText: 'The experience is built around visible, recoverable state.',
    lobby: 'Waiting for players',
    lobbyText: 'Room ready · code 4K7M',
    turn: 'Your turn',
    turnText: 'Primary actions are always within reach.',
    reconnect: 'Reconnecting',
    reconnectText: 'Seat and progress are kept safe.',
    spanish: 'Spanish deck',
    american: 'American deck',
    all: 'All',
    demo: 'Visual demo',
    demoText: 'These cards are sample data; rules arrive in a later phase.',
    back: 'Back to home',
    open: 'Open',
    demoStatus: 'Visual demo',
    ready: 'Ready',
    demoValue: 'Sample',
    safe: 'Demo',
    homeLabel: 'Card Games, home',
    note: 'Designed around one clear action at a time.',
    languageLabel: 'Language',
    filterLabel: 'Filter deck',
    modesLabel: 'Available modes',
    heroCardsLabel: 'Demo cards',
    cups: 'Cups',
    spades: 'Spades',
    setupTitle: 'Set up the game',
    setupIntro: 'Add 2 to 4 players to create their score counters.',
    playerName: (number: number) => `Player ${number} name`,
    addPlayer: 'Add player',
    removePlayer: 'Remove',
    startGame: 'Start game',
    playerCountError: 'The game needs 2 to 4 players.',
    emptyNameError: 'Enter a name for every player.',
    duplicateNameError: 'Each player needs a different name.',
    scoresTitle: 'Chinchón scorekeeper',
    scoreLabel: 'points',
    scoreNote: 'Use − or +, the mouse wheel, or swipe up and down on a score counter.',
    decreaseScore: (name: string) => `Subtract one point from ${name}`,
    increaseScore: (name: string) => `Add one point to ${name}`,
    invalidAdjustment: 'This score could not be adjusted.',
    missingScorePlayer: 'That player is not in this game.',
    storageLoading: 'Restoring the saved game…',
    storageSaved: 'Game saved on this device.',
    storageUnavailable: 'Local storage is unavailable. This game will only remain available while this tab is open.',
    storageInvalid: 'The local save cannot be read. Start a new game to replace it.',
    storageSaveError: 'The game could not be saved. It will remain available in this tab.',
    footer: 'Responsive · keyboard · AA contrast',
  },
} as const

const cardLabels: Record<Language, Record<string, string>> = {
  es: {
    'As de oros': 'As de oros', 'Siete de copas': 'Siete de copas', 'Sota de bastos': 'Sota de bastos', 'Rey de espadas': 'Rey de espadas',
  },
  en: {
    'As de oros': 'Ace of coins', 'Siete de copas': 'Seven of cups', 'Sota de bastos': 'Jack of clubs', 'Rey de espadas': 'King of swords',
  },
}

const suitLabels: Record<Language, Record<string, string>> = {
  es: { Oros: 'Oros', Copas: 'Copas', Bastos: 'Bastos', Espadas: 'Espadas', Hearts: 'Corazones', Diamonds: 'Diamantes', Clubs: 'Tréboles', Spades: 'Picas' },
  en: { Oros: 'Coins', Copas: 'Cups', Bastos: 'Clubs', Espadas: 'Swords' },
}

function Card({ card, label, suit }: { card: DemoCard; label: string; suit: string }) {
  return (
    <article className={`playing-card ${card.accent}`} aria-label={label} tabIndex={0}>
      <div className="card-corner">
        <strong>{card.value}</strong>
        <span aria-hidden="true">{card.suitSymbol}</span>
      </div>
      <div className="card-emblem" aria-hidden="true">{card.suitSymbol}</div>
      <div className="card-footer">
        <span>{suit}</span>
        <strong>{card.value}</strong>
      </div>
    </article>
  )
}

function App() {
  const [language, setLanguage] = useState<Language>('es')
  const [view, setView] = useState<View>('home')
  const [deck, setDeck] = useState<DeckKind | 'all'>('all')
  const [playerNames, setPlayerNames] = useState(['', ''])
  const [physicalGame, setPhysicalGame] = useState<PhysicalGame | null>(null)
  const [setupError, setSetupError] = useState<SetupError | null>(null)
  const [scoreError, setScoreError] = useState<'invalid-adjustment' | 'player-not-found' | null>(null)
  const touchStartY = useRef<number | null>(null)
  const suppressTouchClick = useRef(false)
  const [storageStatus, setStorageStatus] = useState<'loading' | 'ready' | 'saved' | 'unavailable' | 'invalid-data' | 'save-failed'>('loading')
  const t = copy[language]

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    const result = loadPhysicalGame()
    if (result.ok) {
      setPhysicalGame(result.game)
      setStorageStatus('ready')
    } else {
      setStorageStatus(result.error)
    }
  }, [])

  useEffect(() => {
    if (!physicalGame || !['ready', 'saved', 'save-failed'].includes(storageStatus)) return
    setStorageStatus(savePhysicalGame(physicalGame) ? 'saved' : 'save-failed')
  }, [physicalGame, storageStatus])

  const cards = useMemo(() => {
    if (deck === 'spanish') return spanishCards
    if (deck === 'american') return americanCards
    return [...spanishCards, ...americanCards]
  }, [deck])

  const navigate = (nextView: View) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startPhysicalGame = () => {
    const result = createPhysicalGame(playerNames)
    if (!result.ok) {
      setSetupError(result.error)
      return
    }
    setSetupError(null)
    setPhysicalGame(result.game)
    if (storageStatus === 'invalid-data' || storageStatus === 'unavailable') setStorageStatus('ready')
  }

  const changePlayerScore = (playerId: string, amount: number) => {
    if (!physicalGame) return
    const result = adjustPlayerScore(physicalGame, playerId, amount)
    if (!result.ok) {
      setScoreError(result.error)
      return
    }
    setScoreError(null)
    setPhysicalGame(result.game)
  }

  const changeScoreWithWheel = (event: WheelEvent<HTMLElement>, playerId: string) => {
    event.preventDefault()
    if (event.deltaY !== 0) changePlayerScore(playerId, event.deltaY < 0 ? 1 : -1)
  }

  const startScoreSwipe = (event: TouchEvent<HTMLElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null
  }

  const finishScoreSwipe = (event: TouchEvent<HTMLElement>, playerId: string) => {
    const endY = event.changedTouches[0]?.clientY
    const startY = touchStartY.current
    touchStartY.current = null
    if (startY === null || endY === undefined) return
    const distance = startY - endY
    if (Math.abs(distance) < 36) return

    event.preventDefault()
    suppressTouchClick.current = true
    window.setTimeout(() => { suppressTouchClick.current = false }, 400)
    changePlayerScore(playerId, distance > 0 ? 1 : -1)
  }

  const handleCounterKeyDown = (event: KeyboardEvent<HTMLElement>, playerId: string) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      changePlayerScore(playerId, 1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      changePlayerScore(playerId, -1)
    }
  }

  const setupErrorText = setupError === 'player-count'
    ? t.playerCountError
    : setupError === 'empty-name'
      ? t.emptyNameError
      : setupError === 'duplicate-name'
        ? t.duplicateNameError
        : null

  const storageStatusText = storageStatus === 'loading'
    ? t.storageLoading
    : storageStatus === 'saved'
      ? t.storageSaved
      : storageStatus === 'unavailable'
        ? t.storageUnavailable
        : storageStatus === 'invalid-data'
          ? t.storageInvalid
          : storageStatus === 'save-failed'
            ? t.storageSaveError
            : null

  const scoreErrorText = scoreError === 'invalid-adjustment'
    ? t.invalidAdjustment
    : scoreError === 'player-not-found'
      ? t.missingScorePlayer
      : null

  return (
    <div className={view === 'physical' && physicalGame ? 'app-shell scorekeeper-shell' : 'app-shell'}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>Card Games</span>
        </button>
        <nav className="main-nav" aria-label={t.navLabel}>
          {t.nav.map((label, index) => {
            const target = ['home', 'physical', 'digital', 'gallery'][index] as View
            return (
              <button
                className={view === target ? 'nav-link active' : 'nav-link'}
                key={label}
                onClick={() => navigate(target)}
                aria-current={view === target ? 'page' : undefined}
              >
                {label}
              </button>
            )
          })}
        </nav>
        <div className="topbar-actions">
          <span className="status-dot" aria-hidden="true" />
          <span className="status-label">{t.demoStatus}</span>
          <div className="language-switcher" role="group" aria-label={t.languageLabel}>
            <button className={language === 'es' ? 'language active' : 'language'} onClick={() => setLanguage('es')} aria-pressed={language === 'es'}>ES</button>
            <button className={language === 'en' ? 'language active' : 'language'} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
          </div>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">{t.eyebrow}</p>
                <h1>{t.title}</h1>
                <p className="hero-intro">{t.intro}</p>
                <div className="hero-actions">
                  <button className="button primary" onClick={() => navigate('gallery')}>{t.primary}<span aria-hidden="true">↗</span></button>
                  <button className="button secondary" onClick={() => navigate('physical')}>{t.secondary}</button>
                </div>
                <div className="hero-note">
                  <span className="note-icon" aria-hidden="true">⌁</span>
                  <span>{t.note}</span>
                </div>
              </div>
              <div className="hero-art" aria-label={t.heroCardsLabel}>
                <div className="sun-orbit orbit-one" />
                <div className="sun-orbit orbit-two" />
                <div className="hero-card card-back tilt-left" aria-hidden="true"><span>✦</span></div>
                <div className="hero-card playing-card warm tilt-main"><div className="card-corner"><strong>7</strong><span>♥</span></div><div className="card-emblem">♥</div><div className="card-footer"><span>{t.cups}</span><strong>7</strong></div></div>
                <div className="hero-card playing-card cool tilt-right"><div className="card-corner"><strong>K</strong><span>♠</span></div><div className="card-emblem">♠</div><div className="card-footer"><span>{t.spades}</span><strong>K</strong></div></div>
              </div>
            </section>

            <section className="mode-grid" aria-label={t.modesLabel}>
              <button className="mode-card physical-mode" onClick={() => navigate('physical')}>
                <div className="mode-icon">♧</div>
                <div><p className="eyebrow">01 · {t.physical}</p><h2>{t.physical}</h2><p>{t.physicalText}</p></div><span className="arrow" aria-hidden="true">↗</span>
              </button>
              <button className="mode-card digital-mode" onClick={() => navigate('digital')}>
                <div className="mode-icon">◈</div>
                <div><p className="eyebrow">02 · {t.digital}</p><h2>{t.digital}</h2><p>{t.digitalText}</p></div><span className="arrow" aria-hidden="true">↗</span>
              </button>
              <button className="mode-card gallery-mode" onClick={() => navigate('gallery')}>
                <div className="mode-icon">▦</div>
                <div><p className="eyebrow">03 · {t.gallery}</p><h2>{t.gallery}</h2><p>{t.galleryText}</p></div><span className="arrow" aria-hidden="true">↗</span>
              </button>
            </section>

            <section className="states-section">
              <div className="section-heading"><div><p className="eyebrow">03 · {t.featured}</p><h2>{t.featured}</h2></div><p>{t.featuredText}</p></div>
              <div className="state-grid">
                <article className="state-card"><span className="state-icon yellow">◌</span><div><h3>{t.lobby}</h3><p>{t.lobbyText}</p></div><span className="state-status">●</span></article>
                <article className="state-card"><span className="state-icon coral">✦</span><div><h3>{t.turn}</h3><p>{t.turnText}</p></div><span className="state-status">●</span></article>
                <article className="state-card"><span className="state-icon lilac">↻</span><div><h3>{t.reconnect}</h3><p>{t.reconnectText}</p></div><span className="state-status">●</span></article>
              </div>
            </section>
          </>
        )}

        {view !== 'home' && (
          <section className="subpage">
            <button className="back-link" onClick={() => navigate('home')}>← {t.back}</button>
            {view === 'gallery' ? (
              <>
                <div className="subpage-heading"><p className="eyebrow">{t.demo}</p><h1>{t.gallery}</h1><p>{t.demoText}</p></div>
                <div className="filter-row" role="group" aria-label={t.filterLabel}>
                  {(['all', 'spanish', 'american'] as const).map((option) => <button key={option} className={deck === option ? 'filter active' : 'filter'} onClick={() => setDeck(option)} aria-pressed={deck === option}>{option === 'all' ? t.all : option === 'spanish' ? t.spanish : t.american}</button>)}
                </div>
                <div className="gallery-grid">{cards.map((card) => <Card key={card.id} card={card} label={cardLabels[language][card.label] ?? card.label} suit={suitLabels[language][card.suit] ?? card.suit} />)}</div>
              </>
            ) : view === 'physical' ? (
                <div className={physicalGame ? 'physical-panel scorekeeper-panel' : 'physical-panel'}>
                  {storageStatusText && <p className={storageStatus === 'saved' ? 'storage-message success' : 'storage-message'} role={storageStatus === 'saved' ? 'status' : 'alert'}>{storageStatusText}</p>}
                  {!physicalGame ? (
                    <>
                      <p className="eyebrow">01 · {t.physical}</p>
                      <h1>{t.setupTitle}</h1>
                      <p>{t.setupIntro}</p>
                      <div className="player-fields">
                        {playerNames.map((name, index) => (
                          <div className="player-field" key={index}>
                            <label htmlFor={`player-name-${index}`}>{t.playerName(index + 1)}</label>
                            <div>
                              <input
                                id={`player-name-${index}`}
                                value={name}
                                onChange={(event) => setPlayerNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                                aria-invalid={Boolean(setupError)}
                                aria-describedby={setupErrorText ? 'setup-error' : undefined}
                                autoComplete="off"
                              />
                              {playerNames.length > 2 && <button className="remove-player" type="button" onClick={() => setPlayerNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t.removePlayer}</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {playerNames.length < 4 && <button className="text-button" type="button" onClick={() => setPlayerNames((current) => [...current, ''])}>+ {t.addPlayer}</button>}
                      {setupErrorText && <p className="form-error" id="setup-error" role="alert">{setupErrorText}</p>}
                      <button className="button primary start-game" type="button" onClick={startPhysicalGame} disabled={storageStatus === 'loading'}>{t.startGame}<span aria-hidden="true">↗</span></button>
                    </>
                  ) : (
                    <>
                      <div className="game-heading">
                        <div><p className="eyebrow">{t.physical} · Chinchón</p><h1>{t.scoresTitle}</h1></div>
                      </div>
                      <section className="scoreboard" aria-labelledby="scoreboard-title">
                        <div className={`score-counter-grid players-${physicalGame.players.length}`}>
                          {physicalGame.players.map((player) => (
                            <article
                              className="score-counter"
                              key={player.id}
                              tabIndex={0}
                              role="group"
                              aria-label={`${player.name}: ${physicalGame.scores[player.id] ?? 0} ${t.scoreLabel}. ${t.scoreNote}`}
                              onWheel={(event) => changeScoreWithWheel(event, player.id)}
                              onTouchStart={startScoreSwipe}
                              onTouchEnd={(event) => finishScoreSwipe(event, player.id)}
                              onClickCapture={(event) => {
                                if (suppressTouchClick.current) {
                                  event.preventDefault()
                                  event.stopPropagation()
                                }
                              }}
                              onKeyDown={(event) => handleCounterKeyDown(event, player.id)}
                            >
                              <h2 className="score-player-name">{player.name}</h2>
                              <div className="score-counter-controls">
                                <button
                                  className="score-step"
                                  type="button"
                                  onClick={() => changePlayerScore(player.id, -1)}
                                  aria-label={t.decreaseScore(player.name)}
                                >−</button>
                                <output className="score-value" aria-label={`${player.name}: ${t.scoreLabel}`} aria-live="polite">
                                  {physicalGame.scores[player.id] ?? 0}
                                </output>
                                <button
                                  className="score-step"
                                  type="button"
                                  onClick={() => changePlayerScore(player.id, 1)}
                                  aria-label={t.increaseScore(player.name)}
                                >+</button>
                              </div>
                            </article>
                          ))}
                        </div>
                        <p className="score-note">{t.scoreNote}</p>
                      </section>
                      {scoreErrorText && <p className="form-error" role="alert">{scoreErrorText}</p>}
                    </>
                  )}
                </div>
              ) : (
                <div className="demo-panel">
                  <p className="eyebrow">02 · {t.digital}</p>
                  <h1>{t.digital}</h1>
                  <p>{t.digitalText}</p>
                  <div className="demo-checks">
                    <div><span className="check" aria-hidden="true">✓</span><span>{t.lobby}</span><strong>{t.ready}</strong></div>
                    <div><span className="check" aria-hidden="true">✓</span><span>{t.turn}</span><strong>{t.demoValue}</strong></div>
                    <div><span className="check" aria-hidden="true">✓</span><span>{t.reconnect}</span><strong>{t.safe}</strong></div>
                  </div>
                  <button className="button primary" onClick={() => navigate('gallery')}>{t.open} {t.gallery}<span aria-hidden="true">↗</span></button>
                </div>
              )
            }
          </section>
        )}
      </main>

      <footer className="footer"><span>Card Games · foundation 01</span><span>{t.footer}</span></footer>
    </div>
  )
}

export default App
