// Copia el motor de dominio compartido a supabase/functions/_shared para que la Edge Function lo despliegue.
// El test scripts/sync-edge-shared.test.ts falla si las copias se desincronizan.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SHARED_DOMAIN_FILES = ['chinchon.ts', 'physicalGame.ts', 'digitalChinchon.ts']

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'supabase', 'functions', '_shared')
mkdirSync(target, { recursive: true })
for (const file of SHARED_DOMAIN_FILES) {
  copyFileSync(join(root, 'src', 'domain', file), join(target, file))
  console.log(`_shared/${file} actualizado`)
}
