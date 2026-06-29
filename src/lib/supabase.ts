import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Fail loud in dev so misconfig is obvious.
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (.env.local)')
}

export const supabase = createClient(url, anonKey)
