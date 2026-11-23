export type GuestIdentity = {
  id: string
  name: string
}

export function createGuestIdentity(name: string): GuestIdentity | null {
  const cleanedName = name.trim()
  if (!cleanedName) return null
  return {
    id: crypto.randomUUID(),
    name: cleanedName,
  }
}
