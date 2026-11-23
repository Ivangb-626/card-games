// Recuerda la última sala digital en este dispositivo para volver a entrar al recargar.
const STORAGE_KEY = 'card-games:digital-room'
const STORAGE_VERSION = 1

export type SavedDigitalRoom = {
  roomId: string
  code: string
}

export function loadSavedDigitalRoom(): SavedDigitalRoom | null {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY)
    if (!serialized) return null
    const saved = JSON.parse(serialized) as { version?: unknown; room?: Partial<SavedDigitalRoom> }
    if (saved.version !== STORAGE_VERSION || !saved.room) return null
    const { roomId, code } = saved.room
    return typeof roomId === 'string' && typeof code === 'string' && code.length > 0 ? { roomId, code } : null
  } catch {
    return null
  }
}

export function saveDigitalRoom(room: SavedDigitalRoom): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, room }))
    return true
  } catch {
    return false
  }
}

export function clearSavedDigitalRoom(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento local no hay nada que borrar.
  }
}
