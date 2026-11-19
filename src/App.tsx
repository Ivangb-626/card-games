import { useMemo, useState } from 'react'
import { americanCards, DemoCard, DeckKind, spanishCards } from './cards'

type Language = 'es' | 'en'
type View = 'home' | 'physical' | 'digital' | 'gallery'

const copy = {
  es: {
    nav: ['Inicio', 'Modo físico', 'Modo digital', 'Galería'],
    eyebrow: 'MESA ABIERTA · MVP VISUAL',
    title: 'Tus cartas, tu mesa, tu ritmo.',
    intro: 'Una base clara para jugar con cartas físicas hoy y preparar partidas digitales privadas mañana.',
    primary: 'Explorar la galería',
    secondary: 'Ver modos de juego',
    physical: 'Modo físico',
    physicalText: 'Organiza una partida presencial, incluso sin red.',
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
  },
  en: {
    nav: ['Home', 'Physical mode', 'Digital mode', 'Gallery'],
    eyebrow: 'OPEN TABLE · VISUAL MVP',
    title: 'Your cards, your table, your pace.',
    intro: 'A clear foundation for playing with physical cards today and preparing private digital games tomorrow.',
    primary: 'Explore the gallery',
    secondary: 'View game modes',
    physical: 'Physical mode',
    physicalText: 'Organise an in-person game, even offline.',
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
  },
} as const

function Card({ card }: { card: DemoCard }) {
  return (
    <article className={`playing-card ${card.accent}`} aria-label={card.label} tabIndex={0}>
      <div className="card-corner">
        <strong>{card.value}</strong>
        <span aria-hidden="true">{card.suitSymbol}</span>
      </div>
      <div className="card-emblem" aria-hidden="true">{card.suitSymbol}</div>
      <div className="card-footer">
        <span>{card.suit}</span>
        <strong>{card.value}</strong>
      </div>
    </article>
  )
}

function App() {
  const [language, setLanguage] = useState<Language>('es')
  const [view, setView] = useState<View>('home')
  const [deck, setDeck] = useState<DeckKind | 'all'>('all')
  const t = copy[language]

  const cards = useMemo(() => {
    if (deck === 'spanish') return spanishCards
    if (deck === 'american') return americanCards
    return [...spanishCards, ...americanCards]
  }, [deck])

  const navigate = (nextView: View) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Card Games, inicio">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>Card Games</span>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
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
          <span className="status-label">MVP demo</span>
          <div className="language-switcher" role="group" aria-label="Idioma">
            <button className={language === 'es' ? 'language active' : 'language'} onClick={() => setLanguage('es')}>ES</button>
            <button className={language === 'en' ? 'language active' : 'language'} onClick={() => setLanguage('en')}>EN</button>
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
                  <span>Diseñado para una acción clara por contexto.</span>
                </div>
              </div>
              <div className="hero-art" aria-label="Cartas de demostración">
                <div className="sun-orbit orbit-one" />
                <div className="sun-orbit orbit-two" />
                <div className="hero-card card-back tilt-left" aria-hidden="true"><span>✦</span></div>
                <div className="hero-card playing-card warm tilt-main"><div className="card-corner"><strong>7</strong><span>♥</span></div><div className="card-emblem">♥</div><div className="card-footer"><span>Copas</span><strong>7</strong></div></div>
                <div className="hero-card playing-card cool tilt-right"><div className="card-corner"><strong>K</strong><span>♠</span></div><div className="card-emblem">♠</div><div className="card-footer"><span>Spades</span><strong>K</strong></div></div>
              </div>
            </section>

            <section className="mode-grid" aria-label="Modos disponibles">
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
                <div className="filter-row" role="group" aria-label="Filtrar baraja">
                  {(['all', 'spanish', 'american'] as const).map((option) => <button key={option} className={deck === option ? 'filter active' : 'filter'} onClick={() => setDeck(option)}>{option === 'all' ? t.all : option === 'spanish' ? t.spanish : t.american}</button>)}
                </div>
                <div className="gallery-grid">{cards.map((card) => <Card key={card.id} card={card} />)}</div>
              </>
            ) : (
              <div className="demo-panel">
                <p className="eyebrow">{view === 'physical' ? '01 · ' + t.physical : '02 · ' + t.digital}</p>
                <h1>{view === 'physical' ? t.physical : t.digital}</h1>
                <p>{view === 'physical' ? t.physicalText : t.digitalText}</p>
                <div className="demo-checks">
                  <div><span className="check">✓</span><span>{t.lobby}</span><strong>Ready</strong></div>
                  <div><span className="check">✓</span><span>{t.turn}</span><strong>Demo</strong></div>
                  <div><span className="check">✓</span><span>{t.reconnect}</span><strong>Safe</strong></div>
                </div>
                <button className="button primary" onClick={() => navigate('gallery')}>{t.open} {t.gallery}<span aria-hidden="true">↗</span></button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer"><span>Card Games · foundation 01</span><span>Responsive · teclado · contraste AA</span></footer>
    </div>
  )
}

export default App
