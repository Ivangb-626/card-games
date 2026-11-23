/** La aplicación solo trabaja con el proyecto de Supabase confirmado (card-games). */
export const SUPABASE_PROJECT_URL = 'https://pqvoolwxgffdmxbvpujs.supabase.co'

export type SupabasePublicConfig = {
  url: string
  anonKey: string
}

export type SupabaseConfigResult =
  | { ok: true; config: SupabasePublicConfig }
  | { ok: false; error: 'missing' }

/**
 * Solo hace falta la clave pública (anon o publishable). La URL es fija para que una
 * variable mal escrita no pueda dejar la aplicación desconectada ni apuntar a otro proyecto.
 */
export function readSupabasePublicConfig(
  anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
): SupabaseConfigResult {
  const key = anonKey?.trim()
  if (!key) return { ok: false, error: 'missing' }
  return { ok: true, config: { url: SUPABASE_PROJECT_URL, anonKey: key } }
}
