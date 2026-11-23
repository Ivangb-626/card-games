import { describe, expect, it } from 'vitest'
import { readSupabasePublicConfig, SUPABASE_PROJECT_URL } from './config'

describe('Supabase public config', () => {
  it('uses the fixed project URL with the public key', () => {
    expect(readSupabasePublicConfig(' sb_publishable_test ')).toEqual({
      ok: true,
      config: { url: SUPABASE_PROJECT_URL, anonKey: 'sb_publishable_test' },
    })
  })

  it('reports a missing public key', () => {
    expect(readSupabasePublicConfig(undefined)).toEqual({ ok: false, error: 'missing' })
    expect(readSupabasePublicConfig('  ')).toEqual({ ok: false, error: 'missing' })
  })
})
