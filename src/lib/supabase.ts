import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Suppress the one-time Supabase PKCE login console noise that leaks the JWT
// into browser dev tools. The pattern `eyJ` is the base64 prefix of every JWT
// header — if a log message contains it, it's almost certainly a token dump.
// We only apply this in production; development keeps full console output.
if (import.meta.env.PROD) {
  const _origError = console.error.bind(console)
  const _origWarn = console.warn.bind(console)
  const containsJwt = (...args: unknown[]) =>
    args.some(a => typeof a === 'string' && a.includes('eyJ'))
  console.error = (...args) => { if (!containsJwt(...args)) _origError(...args) }
  console.warn  = (...args) => { if (!containsJwt(...args)) _origWarn(...args) }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
  },
})
