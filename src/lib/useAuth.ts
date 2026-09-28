import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  /** True until the initial session has been read from storage. */
  loading: boolean
  signInWithGoogle: () => Promise<void>
  /** Throws UserFacingError on failure. */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** Throws UserFacingError on failure. */
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
