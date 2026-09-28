import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { authError } from './errors'
import { appUrl } from './appUrl'
import { AuthContext, type AuthContextValue } from './useAuth'

// Stable across renders — none of these depend on component state.
const actions = {
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('/dashboard') },
    })
    if (error) throw authError(error.message)
  },

  async signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw authError(error.message)
  },

  async signUpWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl('/dashboard') },
    })
    if (error) throw authError(error.message)
  },

  async signOut() {
    await supabase.auth.signOut()
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If this rejects (corrupted localStorage token, network failure), fall
    // back to "no session" rather than leaving `loading` stuck at true.
    supabase.auth.getSession()
      .then(({ data: { session } }) => setSession(session))
      .catch(err => {
        console.error('auth: getSession failed:', err)
        setSession(null)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, ...actions }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
