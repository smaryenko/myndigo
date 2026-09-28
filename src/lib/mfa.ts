// ============================================================
// TOTP multi-factor auth. Stateless wrappers around supabase.auth.mfa —
// plain functions rather than auth-context members so they don't cause
// context re-renders or unstable hook dependencies. All throw on failure
// (see errors.ts for the convention).
// ============================================================

import { supabase } from './supabase'
import { authError } from './errors'

export interface TotpEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

/** The user's verified TOTP factor id, or null if MFA isn't set up. */
export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw authError(error.message)
  return data?.totp?.find(f => f.status === 'verified')?.id ?? null
}

/** True if a verified TOTP factor exists but this session is still AAL1. */
export async function needsMfaStepUp(): Promise<boolean> {
  const [{ data: aal, error: aalError }, factorId] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    getVerifiedTotpFactorId(),
  ])
  if (aalError) throw authError(aalError.message)
  return factorId !== null && aal?.currentLevel === 'aal1'
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Myndigo' })
  if (error || !data) throw authError(error?.message)
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

/** Creates a challenge and verifies the 6-digit code against it. */
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError || !challenge) throw authError(challengeError?.message)
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
  if (error) throw authError(error.message)
}

export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw authError(error.message)
}
