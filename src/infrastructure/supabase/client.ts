import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabasePublicConfig } from './config'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client
  const result = readSupabasePublicConfig()
  if (!result.ok) return null
  client = createClient(result.config.url, result.config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}
