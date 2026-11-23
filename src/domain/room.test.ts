import { describe, expect, it } from 'vitest'
import { createDigitalRoom, joinDigitalRoom } from './room'

describe('digital rooms', () => {
  it('creates a host-owned room for 2-4 player capacity', () => {
    const result = createDigitalRoom('room-1', 'identity-1', 'Ana', '2026-11-22T00:00:00Z')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.room.members).toHaveLength(1)
    expect(result.room.members[0].isHost).toBe(true)
  })

  it('reuses a seat when the same identity reconnects', () => {
    const created = createDigitalRoom('room-1', 'identity-1', 'Ana', '2026-11-22T00:00:00Z')
    if (!created.ok) throw new Error('room setup failed')
    const result = joinDigitalRoom(created.room, 'identity-1', 'Ana')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.room.members).toHaveLength(1)
  })

  it('rejects duplicate names and rooms at capacity', () => {
    const created = createDigitalRoom('room-1', 'identity-1', 'Ana', '2026-11-22T00:00:00Z')
    if (!created.ok) throw new Error('room setup failed')

    let room = created.room
    for (let index = 2; index <= 4; index += 1) {
      const joined = joinDigitalRoom(room, `identity-${index}`, `Jugador ${index}`)
      if (!joined.ok) throw new Error('join failed')
      room = joined.room
    }

    expect(joinDigitalRoom(room, 'identity-5', 'Jugador 5')).toEqual({ ok: false, error: 'member-count' })
    expect(joinDigitalRoom(room, 'identity-5', 'ana')).toEqual({ ok: false, error: 'name-duplicate' })
  })
})
