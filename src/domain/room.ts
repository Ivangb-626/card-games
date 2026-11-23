export type RoomMember = {
  id: string
  identityId: string
  name: string
  isHost: boolean
  connection: 'connected' | 'reconnecting' | 'absent' | 'paused'
  seat: number
}

export type DigitalRoom = {
  id: string
  code: string
  hostMemberId: string
  status: 'waiting' | 'playing' | 'finished' | 'expired'
  expiresAt: string
  members: RoomMember[]
}

export type RoomSetupError = 'name-empty' | 'name-duplicate' | 'member-count' | 'room-not-found'

export type RoomSetupResult =
  | { ok: true; room: DigitalRoom }
  | { ok: false; error: RoomSetupError }

export function cleanMemberName(name: string): string | null {
  const cleaned = name.trim()
  return cleaned.length > 0 ? cleaned : null
}

export function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}

export function createDigitalRoom(
  roomId: string,
  hostIdentityId: string,
  hostName: string,
  expiresAt: string,
): RoomSetupResult {
  const name = cleanMemberName(hostName)
  if (!name) return { ok: false, error: 'name-empty' }

  return {
    ok: true,
    room: {
      id: roomId,
      code: createRoomCode(),
      hostMemberId: hostIdentityId,
      status: 'waiting',
      expiresAt,
      members: [{
        id: hostIdentityId,
        identityId: hostIdentityId,
        name,
        isHost: true,
        connection: 'connected',
        seat: 0,
      }],
    },
  }
}

export function joinDigitalRoom(room: DigitalRoom, identityId: string, name: string): RoomSetupResult {
  const cleanedName = cleanMemberName(name)
  if (!cleanedName) return { ok: false, error: 'name-empty' }
  if (room.members.some((member) => member.identityId === identityId)) return { ok: true, room }
  if (room.members.some((member) => member.name.trim().toLocaleLowerCase() === cleanedName.toLocaleLowerCase())) {
    return { ok: false, error: 'name-duplicate' }
  }
  if (room.members.length >= 4) return { ok: false, error: 'member-count' }

  return {
    ok: true,
    room: {
      ...room,
      members: [...room.members, {
        id: identityId,
        identityId,
        name: cleanedName,
        isHost: false,
        connection: 'connected',
        seat: room.members.length,
      }],
    },
  }
}
