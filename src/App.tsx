import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent, WheelEvent } from 'react'
import {
  adjustRoundScore,
  canCloseRound,
  canRejoin,
  canStartNextRound,
  closeRound,
  createPhysicalGame,
  endGame,
  getBustRoundPoints,
  getLowestScorePlayers,
  getMissingRoundScores,
  MAX_PLAYERS,
  MAX_ROUND_POINTS,
  getRejoinScore,
  getWinners,
  isGameFinished,
  isPlayerEliminated,
  PhysicalGame,
  PhysicalGameError,
  PhysicalGameResult,
  rejoinPlayer,
  setRoundScore,
  SetupError,
  TRADITIONAL_MAX_PLAYERS,
  startNextRound,
} from './domain/physicalGame'
import { clearPhysicalGame, loadPhysicalGame, savePhysicalGame } from './infrastructure/storage/physicalGameStorage'
import { createGuestIdentity } from './domain/identity'
import type { DigitalRoom } from './domain/room'
import { loadGuestIdentity, saveGuestIdentity } from './infrastructure/storage/guestIdentityStorage'
import { clearSavedDigitalRoom, loadSavedDigitalRoom, saveDigitalRoom } from './infrastructure/storage/digitalRoomStorage'
import { DigitalChinchonRoom } from './ui/DigitalChinchonRoom'
import { readSupabasePublicConfig } from './infrastructure/supabase/config'
import {
  createRoomInSupabase,
  joinRoomInSupabase,
  type RoomRepositoryError,
  getRoomFromSupabase,
  subscribeToRoomInSupabase,
} from './infrastructure/supabase/roomRepository'

type Language = 'es' | 'en'
const ROOM_REFRESH_MS = 5000

type View = 'home' | 'physical-games' | 'physical' | 'digital-games' | 'digital'
type RoundEdit =
  | { kind: 'adjust'; amount: number }
  | { kind: 'value'; points: number }
  | { kind: 'type'; raw: string }
type PendingRoundEdit = { playerId: string; edit: RoundEdit; quickLabel?: string }

/** `locks`: tras pulsarlo, el siguiente cambio del jugador en la ronda pide confirmación. */
const QUICK_ROUND_EDITS: { label: string; edit: RoundEdit; locks: boolean }[] = [
  { label: '−10', edit: { kind: 'value', points: -10 }, locks: true },
  { label: '−50', edit: { kind: 'value', points: -50 }, locks: true },
  { label: '0', edit: { kind: 'value', points: 0 }, locks: true },
  { label: '+5', edit: { kind: 'adjust', amount: 5 }, locks: false },
  { label: '+10', edit: { kind: 'adjust', amount: 10 }, locks: false },
]

const copy = {
  es: {
    eyebrow: 'MESA ABIERTA · MVP VISUAL',
    title: 'Tus cartas, tu mesa, tu ritmo.',
    intro: 'Una base clara para jugar con cartas físicas hoy y preparar partidas digitales privadas mañana.',
    primary: 'Explorar la galería',
    secondary: 'Ver modos de juego',
    physical: 'Modo físico',
    physicalText: 'Lleva la puntuación de una partida presencial, incluso sin red.',
    digital: 'Modo digital',
    digitalText: 'Prepara una sala privada por invitación.',
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
    back: 'Volver a modos',
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
    gameSelectionTitle: 'Elige un juego',
    gameSelectionPhysicalIntro: 'Selecciona el juego que quieres gestionar en una partida física.',
    gameSelectionDigitalIntro: 'Selecciona el juego con el que quieres preparar una partida digital.',
    chinchonText: 'Marcador físico para partidas de 2 a 4 jugadores (hasta 6 si queréis).',
    chinchonDigitalText: 'Demostración de partida digital privada.',
    selectGame: 'Seleccionar',
    chinchonDigitalTitle: 'Chinchón digital',
    chinchonDigitalIntro: 'La navegación está lista. Las reglas y las salas privadas se incorporarán en una fase posterior.',
    notAvailableYet: 'Funcionalidad en preparación',
    backToMode: 'Volver a selección',
    playerRange: '2–4 jugadores',
    cups: 'Copas',
    spades: 'Espadas',
    setupTitle: 'Configura la partida',
    setupIntro: 'Añade de 2 a 4 jugadores para crear sus contadores de puntuación. Si queréis, podéis llegar hasta 6.',
    playerName: (number: number) => `Nombre del jugador ${number}`,
    addPlayer: 'Añadir jugador',
    removePlayer: 'Quitar',
    startGame: 'Iniciar partida',
    playerCountError: 'La partida necesita entre 2 y 6 jugadores.',
    extraPlayerConfirmText: (number: number) => `Lo tradicional en Chinchón es jugar de 2 a 4. ¿Seguro que quieres añadir un ${number}.º jugador?`,
    extraPlayerConfirm: 'Sí, añadir',
    emptyNameError: 'Escribe un nombre para cada jugador.',
    duplicateNameError: 'Cada jugador debe tener un nombre distinto.',
    scoresTitle: 'Marcador de Chinchón',
    scoreLabel: 'puntos',
    scoreNote: 'Escribe los puntos de la ronda (máximo 70; en negativo solo -10 o -50) o usa − y +, la rueda del ratón o desliza arriba y abajo sobre cada jugador.',
    decreaseScore: (name: string) => `Restar un punto a la ronda de ${name}`,
    increaseScore: (name: string) => `Sumar un punto a la ronda de ${name}`,
    quickEditLabel: (label: string, name: string) => label.startsWith('+') ? `Sumar ${label.slice(1)} a los puntos de ${name} en esta ronda` : `Poner ${label} como puntos de ${name} en esta ronda`,
    bust: 'Pasarse',
    bustLabel: (name: string, points: number) => `Pasarse: poner ${points} puntos a ${name} en esta ronda para llegar a 101`,
    quickConfirmText: (label: string, name: string) => `Has hecho clic en ${label}. ¿Seguro que quieres modificar más los puntos de ${name} en esta ronda?`,
    quickConfirm: 'Sí, modificar',
    cancel: 'Cancelar',
    endGame: 'Acabar partida',
    endGameConfirmText: '¿Acabar la partida ahora? Se mostrará el resumen final sin ganador.',
    endGameMidRoundConfirmText: '¿Acabar la partida ahora? Los puntos de esta ronda no se contarán y se mostrará el resumen final sin ganador.',
    endedEarlyStatus: (names: string[]) => `Partida terminada antes de tiempo, sin ganador. ${names.length === 1 ? `${names[0]} es quien tiene` : `${names.join(' y ')} son quienes tienen`} menos puntos.`,
    winnerBadge: 'Ganador',
    lowestBadge: 'Menos puntos',
    endGameConfirm: 'Sí, acabar',
    roundLabel: (round: number) => `Ronda ${round}`,
    totalLabel: 'Total',
    roundPointsLabel: (name: string) => `Puntos de ${name} en esta ronda`,
    roundPointsShort: 'Esta ronda',
    sittingOut: 'No juega esta ronda',
    eliminatedBadge: 'Fuera',
    rejoinCount: (count: number) => count === 1 ? '1 reenganche' : `${count} reenganches`,
    summaryTitle: 'Fin de la partida',
    summaryRounds: (count: number) => count === 1 ? '1 ronda' : `${count} rondas`,
    summaryStandings: 'Clasificación final',
    summaryByRound: 'Resumen ronda a ronda',
    summaryRoundColumn: 'Ronda',
    summaryRejoin: (score: number) => `↺ reenganche a ${score}`,
    backToHome: 'Volver al inicio',
    roundOpenStatus: 'Introduce los puntos de cada jugador en esta ronda.',
    roundMissing: (count: number) => count === 1 ? 'Falta 1 puntuación por introducir.' : `Faltan ${count} puntuaciones por introducir.`,
    roundReady: 'Todas las puntuaciones están introducidas.',
    roundClosedStatus: (round: number) => `Ronda ${round} cerrada. Puntuaciones guardadas.`,
    rejoinStatus: 'Quien tenga 101 puntos o más puede reengancharse antes de empezar la siguiente ronda.',
    closeRound: 'Cerrar ronda',
    nextRound: (round: number) => `Empezar ronda ${round}`,
    rejoin: (score: number) => `Reengancharse con ${score}`,
    rejoinLabel: (name: string, score: number) => `Reenganchar a ${name} con ${score} puntos`,
    winnerStatus: (names: string[]) => `Fin de la partida: ${names.length === 1 ? 'gana' : 'ganan'} ${names.join(' y ')}.`,
    newGame: 'Nueva partida',
    invalidScore: 'Esa puntuación no es válida.',
    invalidNegativeError: 'En negativo solo se permiten -10 y -50.',
    missingScorePlayer: 'No se encontró ese jugador en la partida.',
    playerEliminatedError: 'Ese jugador está fuera y no juega esta ronda.',
    roundClosedError: 'La ronda ya está cerrada.',
    roundOpenError: 'Cierra la ronda antes de empezar la siguiente.',
    missingScoresError: 'Faltan puntuaciones por introducir.',
    gameFinishedError: 'La partida ha terminado.',
    notEnoughPlayersError: 'Se necesitan al menos dos jugadores en juego para continuar.',
    rejoinUnavailableError: 'El reenganche solo está disponible entre rondas para quien haya llegado a 101 puntos.',
    storageLoading: 'Recuperando la partida guardada…',
    storageSaved: 'Partida guardada en este dispositivo.',
    storageUnavailable: 'No se puede acceder al almacenamiento local. La partida solo estará disponible mientras esta pestaña permanezca abierta.',
    storageInvalid: 'El guardado local no se puede leer. Inicia una partida nueva para sustituirlo.',
    storageSaveError: 'No se pudo guardar la partida. Seguirá disponible en esta pestaña.',
    footer: 'Responsive · teclado · contraste AA',
  },
  en: {
    eyebrow: 'OPEN TABLE · VISUAL MVP',
    title: 'Your cards, your table, your pace.',
    intro: 'A clear foundation for playing with physical cards today and preparing private digital games tomorrow.',
    secondary: 'View game modes',
    physical: 'Physical mode',
    physicalText: 'Keep score for an in-person game, even offline.',
    digital: 'Digital mode',
    digitalText: 'Prepare a private invite-only room.',
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
    back: 'Back to modes',
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
    gameSelectionTitle: 'Choose a game',
    gameSelectionPhysicalIntro: 'Choose the game you want to manage for an in-person match.',
    gameSelectionDigitalIntro: 'Choose the game you want to use for a private digital match.',
    chinchonText: 'Physical scorekeeper for 2 to 4 players (up to 6 if you like).',
    chinchonDigitalText: 'Private digital match demonstration.',
    selectGame: 'Select',
    chinchonDigitalTitle: 'Digital Chinchón',
    chinchonDigitalIntro: 'The navigation is ready. Rules and private rooms will be added in a later phase.',
    notAvailableYet: 'Feature in preparation',
    backToMode: 'Back to game selection',
    playerRange: '2–4 players',
    cups: 'Cups',
    spades: 'Spades',
    setupTitle: 'Set up the game',
    setupIntro: 'Add 2 to 4 players to create their score counters. You can go up to 6 if you like.',
    playerName: (number: number) => `Player ${number} name`,
    addPlayer: 'Add player',
    removePlayer: 'Remove',
    startGame: 'Start game',
    playerCountError: 'The game needs 2 to 6 players.',
    extraPlayerConfirmText: (number: number) => `Chinchón is traditionally played with 2 to 4. Are you sure you want to add player ${number}?`,
    extraPlayerConfirm: 'Yes, add',
    emptyNameError: 'Enter a name for every player.',
    duplicateNameError: 'Each player needs a different name.',
    scoresTitle: 'Chinchón scorekeeper',
    scoreLabel: 'points',
    scoreNote: 'Type the round points (up to 70; negatives only -10 or -50) or use − and +, the mouse wheel, or swipe up and down on each player.',
    decreaseScore: (name: string) => `Subtract one round point from ${name}`,
    increaseScore: (name: string) => `Add one round point to ${name}`,
    quickEditLabel: (label: string, name: string) => label.startsWith('+') ? `Add ${label.slice(1)} to ${name}'s round points` : `Set ${name}'s round points to ${label}`,
    bust: 'Bust',
    bustLabel: (name: string, points: number) => `Bust: give ${name} ${points} points this round to reach 101`,
    quickConfirmText: (label: string, name: string) => `You tapped ${label}. Are you sure you want to change ${name}'s points again this round?`,
    quickConfirm: 'Yes, change',
    cancel: 'Cancel',
    endGame: 'End game',
    endGameConfirmText: 'End the game now? The final summary will be shown with no winner.',
    endGameMidRoundConfirmText: "End the game now? This round's points won't count and the final summary will be shown with no winner.",
    endedEarlyStatus: (names: string[]) => `Game ended early with no winner. ${names.join(' and ')} ${names.length === 1 ? 'has' : 'have'} the fewest points.`,
    winnerBadge: 'Winner',
    lowestBadge: 'Fewest points',
    endGameConfirm: 'Yes, end it',
    roundLabel: (round: number) => `Round ${round}`,
    totalLabel: 'Total',
    roundPointsLabel: (name: string) => `${name}'s points this round`,
    roundPointsShort: 'This round',
    sittingOut: 'Sitting out this round',
    eliminatedBadge: 'Out',
    rejoinCount: (count: number) => count === 1 ? '1 rejoin' : `${count} rejoins`,
    summaryTitle: 'Game over',
    summaryRounds: (count: number) => count === 1 ? '1 round' : `${count} rounds`,
    summaryStandings: 'Final standings',
    summaryByRound: 'Round by round',
    summaryRoundColumn: 'Round',
    summaryRejoin: (score: number) => `↺ rejoined at ${score}`,
    backToHome: 'Back to start',
    roundOpenStatus: "Enter every player's points for this round.",
    roundMissing: (count: number) => count === 1 ? '1 score still missing.' : `${count} scores still missing.`,
    roundReady: 'All scores have been entered.',
    roundClosedStatus: (round: number) => `Round ${round} closed. Scores saved.`,
    rejoinStatus: 'Players on 101 or more can rejoin before the next round starts.',
    closeRound: 'Close round',
    nextRound: (round: number) => `Start round ${round}`,
    rejoin: (score: number) => `Rejoin at ${score}`,
    rejoinLabel: (name: string, score: number) => `Rejoin ${name} at ${score} points`,
    winnerStatus: (names: string[]) => `Game over: ${names.join(' and ')} ${names.length === 1 ? 'wins' : 'win'}.`,
    newGame: 'New game',
    invalidScore: 'That score is not valid.',
    invalidNegativeError: 'Only -10 and -50 are allowed as negative points.',
    missingScorePlayer: 'That player is not in this game.',
    playerEliminatedError: 'That player is out and sits out this round.',
    roundClosedError: 'The round is already closed.',
    roundOpenError: 'Close the round before starting the next one.',
    missingScoresError: 'Some scores are still missing.',
    gameFinishedError: 'The game is over.',
    notEnoughPlayersError: 'At least two players must be in to continue.',
    rejoinUnavailableError: 'Rejoining is only available between rounds for players who reached 101.',
    storageLoading: 'Restoring the saved game…',
    storageSaved: 'Game saved on this device.',
    storageUnavailable: 'Local storage is unavailable. This game will only remain available while this tab is open.',
    storageInvalid: 'The local save cannot be read. Start a new game to replace it.',
    storageSaveError: 'The game could not be saved. It will remain available in this tab.',
    footer: 'Responsive · keyboard · AA contrast',
  },
} as const

function App() {
  const language: Language = 'es'
  const [view, setView] = useState<View>('home')
  const [playerNames, setPlayerNames] = useState(['', ''])
  const [physicalGame, setPhysicalGame] = useState<PhysicalGame | null>(null)
  const [setupError, setSetupError] = useState<SetupError | null>(null)
  const [scoreError, setScoreError] = useState<PhysicalGameError | null>(null)
  const [roundScoreDrafts, setRoundScoreDrafts] = useState<Record<string, string>>({})
  const [quickEditLocks, setQuickEditLocks] = useState<Record<string, string>>({})
  const [pendingRoundEdit, setPendingRoundEdit] = useState<PendingRoundEdit | null>(null)
  const [confirmingEndGame, setConfirmingEndGame] = useState(false)
  const [confirmingExtraPlayer, setConfirmingExtraPlayer] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const suppressTouchClick = useRef(false)
  const [storageStatus, setStorageStatus] = useState<'loading' | 'ready' | 'saved' | 'unavailable' | 'invalid-data' | 'save-failed'>('loading')
  const [guestName, setGuestName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [digitalRoom, setDigitalRoom] = useState<DigitalRoom | null>(null)
  const [digitalIdentityId, setDigitalIdentityId] = useState<string | null>(null)
  const [digitalError, setDigitalError] = useState<string | null>(null)
  const [digitalLoading, setDigitalLoading] = useState(false)
  const supabaseConfiguration = readSupabasePublicConfig()
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
    const result = loadGuestIdentity()
    if (result.ok) setGuestName(result.identity?.name ?? '')
  }, [])

  // Reconexión: si este dispositivo estaba en una sala, vuelve a entrar con la misma identidad.
  useEffect(() => {
    const saved = loadSavedDigitalRoom()
    const identityResult = loadGuestIdentity()
    const identity = identityResult.ok ? identityResult.identity : null
    if (!saved || !identity || !supabaseConfiguration.ok) return
    let cancelled = false
    void joinRoomInSupabase(saved.code, identity.id, identity.name).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDigitalIdentityId(identity.id)
        setDigitalRoom(result.room)
      } else {
        clearSavedDigitalRoom()
      }
    })
    return () => { cancelled = true }
  }, [supabaseConfiguration.ok])

  useEffect(() => {
    if (!physicalGame || !['ready', 'saved', 'save-failed'].includes(storageStatus)) return
    setStorageStatus(savePhysicalGame(physicalGame) ? 'saved' : 'save-failed')
  }, [physicalGame, storageStatus])

  useEffect(() => {
    if (!digitalRoom) return
    const roomId = digitalRoom.id
    const unsubscribe = subscribeToRoomInSupabase(roomId, setDigitalRoom)
    // Respaldo por si se pierde algún aviso de Realtime: la sala se relee cada pocos segundos.
    const interval = window.setInterval(() => {
      void getRoomFromSupabase(roomId).then((result) => {
        if (result.ok) setDigitalRoom(result.room)
      })
    }, ROOM_REFRESH_MS)
    return () => {
      unsubscribe?.()
      window.clearInterval(interval)
    }
  }, [digitalRoom?.id])

  const navigate = (nextView: View) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addPlayer = () => {
    setConfirmingExtraPlayer(false)
    setPlayerNames((current) => current.length < MAX_PLAYERS ? [...current, ''] : current)
  }

  const requestAddPlayer = () => {
    if (playerNames.length >= TRADITIONAL_MAX_PLAYERS) {
      setConfirmingExtraPlayer(true)
      return
    }
    addPlayer()
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

  const applyGameResult = (result: PhysicalGameResult): boolean => {
    if (!result.ok) {
      setScoreError(result.error)
      return false
    }
    setScoreError(null)
    setPhysicalGame(result.game)
    return true
  }

  const clearRoundScoreDraft = (playerId: string) => {
    setRoundScoreDrafts((current) => {
      const { [playerId]: _removed, ...rest } = current
      return rest
    })
  }

  const resetRoundEditing = () => {
    setRoundScoreDrafts({})
    setQuickEditLocks({})
    setPendingRoundEdit(null)
  }

  const applyRoundEdit = (playerId: string, edit: RoundEdit): boolean => {
    if (!physicalGame) return false
    if (edit.kind === 'type') {
      // "-", "-1" y "-5" son pasos intermedios hacia -10 o -50: cuentan como vacío.
      const partialNegative = /^-[15]?$/.test(edit.raw)
      const points = edit.raw === '' || partialNegative ? null : Number(edit.raw)
      if (!applyGameResult(setRoundScore(physicalGame, playerId, points))) return false
      const shown = points !== null && points > MAX_ROUND_POINTS ? String(MAX_ROUND_POINTS) : edit.raw
      setRoundScoreDrafts((current) => ({ ...current, [playerId]: shown }))
      return true
    }
    const result = edit.kind === 'adjust'
      ? adjustRoundScore(physicalGame, playerId, edit.amount)
      : setRoundScore(physicalGame, playerId, edit.points)
    if (!applyGameResult(result)) return false
    clearRoundScoreDraft(playerId)
    return true
  }

  const lockAfterQuickEdit = (playerId: string, quickLabel?: string) => {
    setQuickEditLocks((current) => {
      const { [playerId]: _previous, ...rest } = current
      return quickLabel ? { ...rest, [playerId]: quickLabel } : rest
    })
  }

  /** Tras un botón rápido (−10, −50, 0), cualquier otro cambio del jugador en la ronda pide confirmación. */
  const requestRoundEdit = (playerId: string, edit: RoundEdit, quickLabel?: string) => {
    if (pendingRoundEdit) return
    if (edit.kind === 'type' && !/^-?\d*$/.test(edit.raw)) return
    if (quickEditLocks[playerId]) {
      setPendingRoundEdit({ playerId, edit, quickLabel })
      return
    }
    if (applyRoundEdit(playerId, edit) && quickLabel) lockAfterQuickEdit(playerId, quickLabel)
  }

  const confirmPendingRoundEdit = () => {
    if (!pendingRoundEdit) return
    const { playerId, edit, quickLabel } = pendingRoundEdit
    setPendingRoundEdit(null)
    if (applyRoundEdit(playerId, edit)) lockAfterQuickEdit(playerId, quickLabel)
  }

  const changePlayerScore = (playerId: string, amount: number) => requestRoundEdit(playerId, { kind: 'adjust', amount })

  const typeRoundScore = (playerId: string, raw: string) => requestRoundEdit(playerId, { kind: 'type', raw })

  const closeCurrentRound = () => {
    if (!physicalGame) return
    if (applyGameResult(closeRound(physicalGame))) resetRoundEditing()
  }

  const beginNextRound = () => {
    if (!physicalGame) return
    if (!applyGameResult(startNextRound(physicalGame))) return
    resetRoundEditing()
    setConfirmingEndGame(false)
  }

  const rejoinPhysicalPlayer = (playerId: string) => {
    if (!physicalGame) return
    applyGameResult(rejoinPlayer(physicalGame, playerId))
  }

  const discardPhysicalGame = () => {
    if (!physicalGame) return
    setPlayerNames(physicalGame.players.map((player) => player.name))
    clearPhysicalGame()
    setPhysicalGame(null)
    setScoreError(null)
    setConfirmingEndGame(false)
    resetRoundEditing()
  }

  const startNewPhysicalGame = () => discardPhysicalGame()

  const returnHomeFromPhysicalGame = () => {
    discardPhysicalGame()
    navigate('home')
  }

  const endPhysicalGame = () => {
    if (!physicalGame) return
    setConfirmingEndGame(false)
    if (!applyGameResult(endGame(physicalGame))) return
    resetRoundEditing()
    window.scrollTo({ top: 0 })
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

  const resolveGuestIdentity = (): { id: string; name: string } | null => {
    const current = loadGuestIdentity()
    const existing = current.ok ? current.identity : null
    const enteredName = guestName.trim()
    if (existing && enteredName && existing.name !== enteredName) {
      const updated = { ...existing, name: enteredName }
      if (saveGuestIdentity(updated)) return updated
    }
    if (existing) return enteredName ? existing : null
    const created = createGuestIdentity(guestName)
    if (!created) return null
    if (!saveGuestIdentity(created)) return null
    return created
  }

  const enterDigitalRoom = (room: DigitalRoom, identityId: string) => {
    setDigitalIdentityId(identityId)
    setDigitalRoom(room)
    saveDigitalRoom({ roomId: room.id, code: room.code })
  }

  const leaveDigitalRoom = () => {
    setDigitalRoom(null)
    clearSavedDigitalRoom()
  }

  const roomErrorText = (error: RoomRepositoryError, detail: string | undefined, fallback: string) => {
    const messages: Record<RoomRepositoryError, string> = {
      'not-configured': 'Supabase no está configurado en este entorno.',
      'guest-session-failed': 'No se pudo iniciar la sesión de invitado en Supabase. Comprueba que el inicio de sesión anónimo está activado.',
      'room-not-found': 'El código no es válido o la sala ha caducado.',
      'room-full': 'La sala está llena.',
      'name-duplicate': 'Ya hay alguien con ese nombre en la sala.',
      'game-started': 'La partida de esa sala está en juego: solo se puede entrar entre rondas.',
      'supabase-error': fallback,
    }
    return detail && (error === 'guest-session-failed' || error === 'supabase-error')
      ? `${messages[error]} (${detail})`
      : messages[error]
  }

  const createDigitalRoom = async () => {
    if (!supabaseConfiguration.ok) {
      setDigitalError('Supabase no está configurado en este entorno.')
      return
    }
    setDigitalLoading(true)
    setDigitalError(null)
    const identity = resolveGuestIdentity()
    if (!identity) {
      setDigitalError('Escribe un nombre temporal.')
      setDigitalLoading(false)
      return
    }
    const result = await createRoomInSupabase(identity.id, identity.name)
    if (!result.ok) {
      setDigitalError(roomErrorText(result.error, result.detail, 'No se pudo crear la sala.'))
    } else {
      enterDigitalRoom(result.room, identity.id)
    }
    setDigitalLoading(false)
  }

  const joinDigitalRoom = async () => {
    if (!supabaseConfiguration.ok) {
      setDigitalError('Supabase no está configurado en este entorno.')
      return
    }
    if (!joinCode.trim()) {
      setDigitalError('Introduce el código de invitación.')
      return
    }
    setDigitalLoading(true)
    setDigitalError(null)
    const identity = resolveGuestIdentity()
    if (!identity) {
      setDigitalError('Escribe un nombre temporal.')
      setDigitalLoading(false)
      return
    }
    const result = await joinRoomInSupabase(joinCode, identity.id, identity.name)
    if (!result.ok) {
      setDigitalError(roomErrorText(result.error, result.detail, 'No se pudo entrar en la sala.'))
    } else {
      enterDigitalRoom(result.room, identity.id)
    }
    setDigitalLoading(false)
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

  const scoreErrorText = scoreError === null ? null : {
    'invalid-score': t.invalidScore,
    'invalid-negative': t.invalidNegativeError,
    'player-not-found': t.missingScorePlayer,
    'player-eliminated': t.playerEliminatedError,
    'round-closed': t.roundClosedError,
    'round-open': t.roundOpenError,
    'missing-scores': t.missingScoresError,
    'game-finished': t.gameFinishedError,
    'not-enough-players': t.notEnoughPlayersError,
    'rejoin-unavailable': t.rejoinUnavailableError,
  }[scoreError]

  const winners = physicalGame ? getWinners(physicalGame) : []
  const winnerIds = new Set(winners.map((player) => player.id))
  const lowestScorePlayers = physicalGame ? getLowestScorePlayers(physicalGame) : []
  const lowestScoreIds = new Set(lowestScorePlayers.map((player) => player.id))
  const gameFinished = physicalGame ? isGameFinished(physicalGame) : false
  const rejoinScore = physicalGame ? getRejoinScore(physicalGame) : null
  const missingRoundScores = physicalGame ? getMissingRoundScores(physicalGame).length : 0
  const formatRoundPoints = (points: number | null) => points === null ? '—' : points > 0 ? `+${points}` : String(points)

  return (
    <div className={`${view === 'home' ? 'app-shell mode-picker-shell' : 'app-shell'}${view === 'physical' && physicalGame && !gameFinished ? ' scorekeeper-shell' : ''}`}>
      <main>
        {view === 'home' && (
          <section className="mode-picker" aria-label={t.modesLabel}>
            <button className="mode-picker-card physical-mode" type="button" onClick={() => navigate('physical-games')}>
              <span className="mode-icon" aria-hidden="true">♧</span>
              <span>{t.physical}</span>
              <span className="arrow" aria-hidden="true">↗</span>
            </button>
            <button className="mode-picker-card digital-mode" type="button" onClick={() => navigate('digital-games')}>
              <span className="mode-icon" aria-hidden="true">◈</span>
              <span>{t.digital}</span>
              <span className="arrow" aria-hidden="true">↗</span>
            </button>
          </section>
        )}

        {view !== 'home' && (
          <section className="subpage">
            <button
              className="back-link"
              onClick={() => navigate(view === 'physical-games' || view === 'digital-games' ? 'home' : view === 'physical' ? 'physical-games' : view === 'digital' ? 'digital-games' : 'home')}
            >← {view === 'physical-games' || view === 'digital-games' ? t.back : t.backToMode}</button>
            {view === 'physical-games' ? (
              <>
                <div className="subpage-heading">
                  <p className="eyebrow">01 · {t.physical}</p>
                  <h1>{t.gameSelectionTitle}</h1>
                  <p>{t.gameSelectionPhysicalIntro}</p>
                </div>
                <div className="game-selection-grid">
                  <button className="game-selection-card" type="button" onClick={() => navigate('physical')}>
                    <span className="game-selection-icon" aria-hidden="true">♧</span>
                    <span className="game-selection-copy">
                      <span className="eyebrow">{t.playerRange}</span>
                      <strong>Chinchón</strong>
                      <span>{t.chinchonText}</span>
                    </span>
                    <span className="arrow" aria-hidden="true">↗</span>
                    <span className="game-selection-action">{t.selectGame}</span>
                  </button>
                </div>
              </>
            ) : view === 'digital-games' ? (
              <>
                <div className="subpage-heading">
                  <p className="eyebrow">02 · {t.digital}</p>
                  <h1>{t.gameSelectionTitle}</h1>
                  <p>{t.gameSelectionDigitalIntro}</p>
                </div>
                <div className="game-selection-grid">
                  <button className="game-selection-card digital-game-card" type="button" onClick={() => navigate('digital')}>
                    <span className="game-selection-icon" aria-hidden="true">◈</span>
                    <span className="game-selection-copy">
                      <span className="eyebrow">{t.playerRange}</span>
                      <strong>Chinchón</strong>
                      <span>{t.chinchonDigitalText}</span>
                    </span>
                    <span className="arrow" aria-hidden="true">↗</span>
                    <span className="game-selection-action">{t.selectGame}</span>
                  </button>
                </div>
              </>
            ) : view === 'physical' ? (
                <div className={physicalGame && !gameFinished ? `physical-panel scorekeeper-panel players-${physicalGame.players.length}` : physicalGame ? 'physical-panel game-summary-panel' : 'physical-panel'}>
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
                              {playerNames.length > 2 && <button className="remove-player" type="button" onClick={() => { setConfirmingExtraPlayer(false); setPlayerNames((current) => current.filter((_, itemIndex) => itemIndex !== index)) }}>{t.removePlayer}</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {playerNames.length < MAX_PLAYERS && !confirmingExtraPlayer && (
                        <button className="add-player-button" type="button" onClick={requestAddPlayer}><span aria-hidden="true">+</span> {t.addPlayer}</button>
                      )}
                      {confirmingExtraPlayer && (
                        <div className="extra-player-confirm" role="alertdialog" aria-label={t.extraPlayerConfirmText(playerNames.length + 1)}>
                          <p>{t.extraPlayerConfirmText(playerNames.length + 1)}</p>
                          <div>
                            <button className="button primary" type="button" onClick={addPlayer} autoFocus>{t.extraPlayerConfirm}</button>
                            <button className="button secondary" type="button" onClick={() => setConfirmingExtraPlayer(false)}>{t.cancel}</button>
                          </div>
                        </div>
                      )}
                      {setupErrorText && <p className="form-error" id="setup-error" role="alert">{setupErrorText}</p>}
                      <button className="button primary start-game" type="button" onClick={startPhysicalGame} disabled={storageStatus === 'loading'}>{t.startGame}<span aria-hidden="true">↗</span></button>
                    </>
                  ) : gameFinished ? (
                    <>
                      <p className="eyebrow">{t.physical} · Chinchón · {t.summaryRounds(physicalGame.rounds.length)}</p>
                      <h1>{t.summaryTitle}</h1>
                      {winners.length > 0 ? (
                        <p className="summary-winner" role="status">
                          <span aria-hidden="true">🏆</span> {t.winnerStatus(winners.map((player) => player.name))}
                        </p>
                      ) : (
                        <p className="summary-lowest" role="status">
                          {t.endedEarlyStatus(lowestScorePlayers.map((player) => player.name))}
                        </p>
                      )}
                      <ol className="summary-standings" aria-label={t.summaryStandings}>
                        {[...physicalGame.players]
                          .sort((first, second) => physicalGame.scores[first.id] - physicalGame.scores[second.id])
                          .map((player) => (
                            <li
                              key={player.id}
                              className={winnerIds.has(player.id)
                                ? 'is-winner'
                                : winners.length === 0 && lowestScoreIds.has(player.id)
                                  ? 'is-lowest'
                                  : isPlayerEliminated(physicalGame, player.id) ? 'is-eliminated' : undefined}
                            >
                              <strong>
                                {player.name}
                                {winnerIds.has(player.id) && <span className="score-badge winner">{t.winnerBadge}</span>}
                                {winners.length === 0 && lowestScoreIds.has(player.id) && <span className="score-badge lowest">{t.lowestBadge}</span>}
                              </strong>
                              <span>{physicalGame.scores[player.id]} {t.scoreLabel}</span>
                              <span>{t.rejoinCount(physicalGame.rejoins[player.id] ?? 0)}</span>
                            </li>
                          ))}
                      </ol>
                      <h2 className="summary-heading">{t.summaryByRound}</h2>
                      <div className="summary-table-wrap">
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th scope="col">{t.summaryRoundColumn}</th>
                              {physicalGame.players.map((player) => <th scope="col" key={player.id}>{player.name}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {physicalGame.rounds.map((record) => (
                              <tr key={record.round}>
                                <th scope="row">{record.round}</th>
                                {physicalGame.players.map((player) => {
                                  const rejoin = record.rejoins.find((item) => item.playerId === player.id)
                                  const points = record.points[player.id] ?? null
                                  return (
                                    <td key={player.id}>
                                      <span className="summary-points">{points === null ? '—' : formatRoundPoints(points)}</span>
                                      <span className="summary-total">{record.totals[player.id]}</span>
                                      {rejoin && <span className="summary-rejoin">{t.summaryRejoin(rejoin.score)}</span>}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="summary-actions">
                        <button className="button primary" type="button" onClick={startNewPhysicalGame}>{t.newGame}</button>
                        <button className="button secondary" type="button" onClick={returnHomeFromPhysicalGame}>{t.backToHome}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="game-heading">
                        <div><p className="eyebrow">{t.physical} · Chinchón</p><h1>{t.scoresTitle}</h1></div>
                        <p className="round-indicator" aria-live="polite">{t.roundLabel(physicalGame.round)}</p>
                      </div>
                      <section className="scoreboard" aria-label={t.scoresTitle}>
                        <div className={`score-counter-grid players-${physicalGame.players.length}`}>
                          {physicalGame.players.map((player) => {
                            const eliminated = isPlayerEliminated(physicalGame, player.id)
                            const editable = !physicalGame.roundClosed && !eliminated
                            const total = physicalGame.scores[player.id] ?? 0
                            const roundPoints = physicalGame.roundScores[player.id] ?? null
                            const bustPoints = getBustRoundPoints(physicalGame, player.id)
                            // Con más de 4 jugadores el marcador puede desplazarse, así que el deslizamiento táctil se reserva al scroll.
                            const swipeEnabled = editable && physicalGame.players.length <= TRADITIONAL_MAX_PLAYERS
                            return (
                              <article
                                className={`score-counter${eliminated ? ' is-eliminated' : ''}`}
                                key={player.id}
                                tabIndex={editable ? 0 : undefined}
                                role="group"
                                aria-label={`${player.name}: ${total} ${t.scoreLabel}.${editable ? ` ${t.scoreNote}` : ''}`}
                                onWheel={editable ? (event) => changeScoreWithWheel(event, player.id) : undefined}
                                onTouchStart={swipeEnabled ? startScoreSwipe : undefined}
                                onTouchEnd={swipeEnabled ? (event) => finishScoreSwipe(event, player.id) : undefined}
                                onClickCapture={(event) => {
                                  if (suppressTouchClick.current) {
                                    event.preventDefault()
                                    event.stopPropagation()
                                  }
                                }}
                                onKeyDown={editable ? (event) => handleCounterKeyDown(event, player.id) : undefined}
                              >
                                <div className="score-counter-header">
                                  <h2 className="score-player-name">{player.name}</h2>
                                  {eliminated && <span className="score-badge out">{t.eliminatedBadge}</span>}
                                  {physicalGame.roundClosed && (
                                    <span className="score-badge rejoins">{t.rejoinCount(physicalGame.rejoins[player.id] ?? 0)}</span>
                                  )}
                                </div>
                                <p className="score-total">
                                  <span>{t.totalLabel}</span>
                                  <output className="score-value" aria-label={`${player.name}: ${t.totalLabel}`} aria-live="polite">{total}</output>
                                </p>
                                {editable ? (
                                  <div className="score-counter-controls">
                                    <button
                                      className="score-step"
                                      type="button"
                                      onClick={() => changePlayerScore(player.id, -1)}
                                      aria-label={t.decreaseScore(player.name)}
                                    >−</button>
                                    <input
                                      className="round-score-input"
                                      type="text"
                                      inputMode="numeric"
                                      pattern="-?[0-9]*"
                                      maxLength={3}
                                      placeholder="—"
                                      autoComplete="off"
                                      aria-label={t.roundPointsLabel(player.name)}
                                      value={roundScoreDrafts[player.id] ?? (roundPoints === null ? '' : String(roundPoints))}
                                      onChange={(event) => typeRoundScore(player.id, event.target.value)}
                                      onBlur={() => clearRoundScoreDraft(player.id)}
                                    />
                                    <button
                                      className="score-step"
                                      type="button"
                                      onClick={() => changePlayerScore(player.id, 1)}
                                      aria-label={t.increaseScore(player.name)}
                                    >+</button>
                                  </div>
                                ) : physicalGame.roundClosed && canRejoin(physicalGame, player.id) && rejoinScore !== null ? (
                                  <button
                                    className="button primary rejoin-button"
                                    type="button"
                                    onClick={() => rejoinPhysicalPlayer(player.id)}
                                    aria-label={t.rejoinLabel(player.name, rejoinScore)}
                                  >{t.rejoin(rejoinScore)}</button>
                                ) : (
                                  <p className="round-result">
                                    {eliminated && !physicalGame.roundClosed
                                      ? t.sittingOut
                                      : `${t.roundPointsShort}: ${eliminated && roundPoints === null ? '—' : formatRoundPoints(roundPoints)}`}
                                  </p>
                                )}
                                {editable && (
                                  <div className="score-quick-steps">
                                    {QUICK_ROUND_EDITS.map(({ label, edit, locks }) => (
                                      <button
                                        key={label}
                                        className={locks ? 'score-quick-step' : 'score-quick-step is-add'}
                                        type="button"
                                        onClick={() => requestRoundEdit(player.id, edit, locks ? label : undefined)}
                                        aria-label={t.quickEditLabel(label, player.name)}
                                      >{label}</button>
                                    ))}
                                    {bustPoints !== null && (
                                      <button
                                        className="score-quick-step is-bust"
                                        type="button"
                                        onClick={() => requestRoundEdit(player.id, { kind: 'value', points: bustPoints }, t.bust)}
                                        aria-label={t.bustLabel(player.name, bustPoints)}
                                        title={`+${bustPoints}`}
                                      >{t.bust}</button>
                                    )}
                                  </div>
                                )}
                                {pendingRoundEdit?.playerId === player.id && (
                                  <div
                                    className="quick-confirm"
                                    role="alertdialog"
                                    aria-label={t.quickConfirmText(quickEditLocks[player.id] ?? '', player.name)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Escape') setPendingRoundEdit(null)
                                    }}
                                  >
                                    <p>{t.quickConfirmText(quickEditLocks[player.id] ?? '', player.name)}</p>
                                    <div>
                                      <button className="button primary" type="button" onClick={confirmPendingRoundEdit} autoFocus>{t.quickConfirm}</button>
                                      <button className="button secondary" type="button" onClick={() => setPendingRoundEdit(null)}>{t.cancel}</button>
                                    </div>
                                  </div>
                                )}
                              </article>
                            )
                          })}
                        </div>
                      </section>
                      <div className="round-actions">
                        <p className="round-status" role="status">
                          {physicalGame.roundClosed
                            ? `${t.roundClosedStatus(physicalGame.round)}${physicalGame.players.some((player) => canRejoin(physicalGame, player.id)) ? ` ${t.rejoinStatus}` : ''}`
                            : missingRoundScores > 0
                              ? `${t.roundOpenStatus} ${t.roundMissing(missingRoundScores)}`
                              : t.roundReady}
                        </p>
                        {!physicalGame.roundClosed && canCloseRound(physicalGame) && (
                          <button className="button primary" type="button" onClick={closeCurrentRound}>{t.closeRound}</button>
                        )}
                        {canStartNextRound(physicalGame) && (
                          <button className="button primary" type="button" onClick={beginNextRound}>{t.nextRound(physicalGame.round + 1)}</button>
                        )}
                        {!confirmingEndGame && (
                          <button className="button secondary end-game-button" type="button" onClick={() => setConfirmingEndGame(true)}>{t.endGame}</button>
                        )}
                      </div>
                      {confirmingEndGame && (
                        <div className="end-game-confirm" role="alertdialog" aria-label={physicalGame.roundClosed ? t.endGameConfirmText : t.endGameMidRoundConfirmText}>
                          <p>{physicalGame.roundClosed ? t.endGameConfirmText : t.endGameMidRoundConfirmText}</p>
                          <button className="button primary danger" type="button" onClick={endPhysicalGame} autoFocus>{t.endGameConfirm}</button>
                          <button className="button secondary" type="button" onClick={() => setConfirmingEndGame(false)}>{t.cancel}</button>
                        </div>
                      )}
                      {!physicalGame.roundClosed && <p className="score-note">{t.scoreNote}</p>}
                      {scoreErrorText && <p className="form-error" role="alert">{scoreErrorText}</p>}
                    </>
                  )}
                </div>
              ) : digitalRoom ? (
                  <DigitalChinchonRoom
                    room={digitalRoom}
                    memberId={digitalRoom.members.find((member) => member.identityId === digitalIdentityId)?.id ?? null}
                    language={language}
                    onLeave={leaveDigitalRoom}
                  />
              ) : (
                  <div className="digital-room-panel">
                    <p className="eyebrow">02 · {t.digital} · Chinchón</p>
                      <>
                        <h1>Crear o entrar en una sala</h1>
                        <p>Identidad temporal guardada en este dispositivo. La partida puede tener entre 2 y 4 jugadores.</p>
                        {!supabaseConfiguration.ok && (
                          <p className="room-config-error" role="alert">
                            Falta la configuración pública de Supabase en este entorno. No se abrirá una sala simulada.
                          </p>
                        )}
                        <div className="room-identity">
                          <label htmlFor="guest-name">Nombre temporal</label>
                          <input
                            id="guest-name"
                            value={guestName}
                            onChange={(event) => setGuestName(event.target.value)}
                            autoComplete="nickname"
                            maxLength={24}
                          />
                        </div>
                        <div className="room-actions">
                          <button className="button primary" type="button" onClick={createDigitalRoom} disabled={digitalLoading || !supabaseConfiguration.ok}>
                            Crear sala
                          </button>
                          <div className="join-room">
                            <label htmlFor="join-code">Código de invitación</label>
                            <input
                              id="join-code"
                              value={joinCode}
                              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                              maxLength={6}
                              autoComplete="off"
                            />
                            <button className="button secondary" type="button" onClick={joinDigitalRoom} disabled={digitalLoading || !supabaseConfiguration.ok}>
                              Entrar
                            </button>
                          </div>
                        </div>
                        {digitalError && <p className="form-error" role="alert">{digitalError}</p>}
                      </>
                  </div>
              )
            }
          </section>
        )}
      </main>

    </div>
  )
}

export default App
