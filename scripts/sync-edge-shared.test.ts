import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Debe coincidir con SHARED_DOMAIN_FILES de sync-edge-shared.mjs (importarlo ejecutaría la copia).
const SHARED_DOMAIN_FILES = ['chinchon.ts', 'physicalGame.ts', 'digitalChinchon.ts']

describe('Edge Function shared domain', () => {
  it.each(SHARED_DOMAIN_FILES)('keeps supabase/functions/_shared/%s in sync (run npm run sync:edge)', (file) => {
    const source = readFileSync(join(process.cwd(), 'src', 'domain', file), 'utf-8')
    const copy = readFileSync(join(process.cwd(), 'supabase', 'functions', '_shared', file), 'utf-8')
    expect(copy).toBe(source)
  })
})
