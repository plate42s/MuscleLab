import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined

function looksConfigured(url?: string, key?: string) {
  if (!url || !key) return false
  if (url.includes('YOUR_PROJECT')) return false
  if (key.includes('YOUR_SUPABASE') || key.includes('YOUR_PUBLISHABLE')) return false
  return true
}

export const isSupabaseConfigured = looksConfigured(supabaseUrl, supabaseKey)

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : (null as unknown as SupabaseClient)
