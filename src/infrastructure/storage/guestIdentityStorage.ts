import type { GuestIdentity } from '../../domain/identity'

const STORAGE_KEY = 'card-games:guest-identity'
const STORAGE_VERSION = 1

export type IdentityLoadResult =
  | { ok: true; identity: GuestIdentity | null }
  | { ok: false; error: 'unavailable' | 'invalid-data' }

export function loadGuestIdentity(): IdentityLoadResult {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY)
    if (!serialized) return { ok: true, identity: null }
    const saved = JSON.parse(serialized) as { version?: unknown; identity?: unknown }
    if (saved.version !== STORAGE_VERSION || !saved.identity || typeof saved.identity !== 'object') {
      return { ok: false, error: 'invalid-data' }
    }
    const identity = saved.identity as Partial<GuestIdentity>
    if (typeof identity.id !== 'string' || identity.id.length === 0 || typeof identity.name !== 'string' || identity.name.trim().length === 0) {
      return { ok: false, error: 'invalid-data' }
    }
    return { ok: true, identity: { id: identity.id, name: identity.name.trim() } }
  } catch {
    return { ok: false, error: 'unavailable' }
  }
}

export function saveGuestIdentity(identity: GuestIdentity): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, identity }))
    return true
  } catch {
    return false
  }
}
