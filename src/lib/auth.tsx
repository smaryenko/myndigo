import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthMFAEnrollTOTPResponse, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** Authenticator Assurance Level — 'aal2' means an MFA challenge has been completed this session. */
export type AalLevel = 'aal1' | 'aal2' | null

interface AalCheckResult {
  /** True if a verified TOTP factor exists but the session hasn't stepped up to aal2 yet. */
  needsMfaStepUp: boolean
}

interface MfaFactor {
  id: string
  status: 'verified' | 'unverified'
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Access token for the current session, used to authorize calls to backend functions. */
  getAccessToken: () => Promise<string | null>
  /** Checks whether the current session needs an MFA step-up challenge before proceeding. */
  checkAalStepUp: () => Promise<AalCheckResult>
  /** Returns the verified TOTP factor, if any, for the current user. */
  getVerifiedTotpFactor: () => Promise<MfaFactor | null>
  enrollTotp: () => Promise<{ data: AuthMFAEnrollTOTPResponse['data'] | null; error: string | null }>
  challengeTotp: (factorId: string) => Promise<{ challengeId: string | null; error: string | null }>
  verifyTotp: (factorId: string, challengeId: string, code: string) => Promise<{ error: string | null }>
  unenrollTotp: (factorId: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// window.location.origin never includes a path (e.g. "/myndigo"), so on a
// host serving from a subpath (GitHub Pages) it must be combined with
// Vite's configured BASE_URL — otherwise OAuth/email redirects land one
// level too high and 404 (e.g. https://host/dashboard instead of
// https://host/myndigo/dashboard).
function appOrigin(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session. If this rejects (corrupted localStorage token,
    // network failure), fall back to "no session" rather than leaving
    // `loading` stuck at true forever — a rejected promise here previously
    // meant setLoading(false) never ran, and every ProtectedRoute stayed on
    // its spinner permanently with no way to recover short of clearing storage.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })
      .catch(err => {
        console.error('auth: getSession failed:', err)
        setSession(null)
      })
      .finally(() => setLoading(false))

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appOrigin()}/dashboard`,
      },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appOrigin()}/dashboard`,
      },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const checkAalStepUp = async (): Promise<AalCheckResult> => {
    const [{ data: assuranceData }, { data: factorsData }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])

    const hasVerifiedTotp = factorsData?.totp?.some(f => f.status === 'verified') ?? false
    const currentAal = assuranceData?.currentLevel

    return { needsMfaStepUp: hasVerifiedTotp && currentAal === 'aal1' }
  }

  const getVerifiedTotpFactor = async (): Promise<MfaFactor | null> => {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find(f => f.status === 'verified')
    return verified ? { id: verified.id, status: verified.status } : null
  }

  const enrollTotp = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Myndigo' })
    return { data: data ?? null, error: error?.message ?? null }
  }

  const challengeTotp = async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    return { challengeId: data?.id ?? null, error: error?.message ?? null }
  }

  const verifyTotp = async (factorId: string, challengeId: string, code: string) => {
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
    return { error: error?.message ?? null }
  }

  const unenrollTotp = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        getAccessToken,
        checkAalStepUp,
        getVerifiedTotpFactor,
        enrollTotp,
        challengeTotp,
        verifyTotp,
        unenrollTotp,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
