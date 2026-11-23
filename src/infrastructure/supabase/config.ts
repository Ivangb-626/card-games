export type SupabasePublicConfig = {
  url: string
  anonKey: string
}

export type SupabaseConfigResult =
  | { ok: true; config: SupabasePublicConfig }
  | { ok: false; error: 'missing' | 'invalid-url' | 'unexpected-host' }

export function readSupabasePublicConfig(
  url = import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
): SupabaseConfigResult {
  if (!url || !anonKey) return { ok: false, error: 'missing' }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: 'invalid-url' }
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'pqvoolwxgffdmxbvpujs.supabase.co') {
    return parsed.protocol !== 'https:' ? { ok: false, error: 'invalid-url' } : { ok: false, error: 'unexpected-host' }
  }
  return { ok: true, config: { url: parsed.toString().replace(/\/$/, ''), anonKey } }
}
