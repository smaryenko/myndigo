import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

type AalStatus = 'loading' | 'ok' | 'needs-mfa' | 'error'

export function ProtectedRoute() {
  const { session, loading, checkAalStepUp } = useAuth()
  const location = useLocation()
  const [aalStatus, setAalStatus] = useState<AalStatus>('loading')

  useEffect(() => {
    if (loading || !session) return

    let cancelled = false

    async function checkAal() {
      try {
        const { needsMfaStepUp } = await checkAalStepUp()

        if (cancelled) return

        setAalStatus(needsMfaStepUp ? 'needs-mfa' : 'ok')
      } catch (err) {
        // Without this catch, a rejected promise here (network failure,
        // Supabase API error) left aalStatus stuck at 'loading' forever —
        // the user would be stuck on the spinner with no way out. Fail
        // closed: send them to login rather than silently granting access.
        console.error('ProtectedRoute: AAL check failed:', err)
        if (!cancelled) setAalStatus('error')
      }
    }

    checkAal()
    return () => { cancelled = true }
  }, [loading, session, checkAalStepUp])

  // Still loading auth session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No session — go to login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Waiting for AAL check
  if (aalStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Has TOTP enrolled but hasn't completed the challenge yet
  if (aalStatus === 'needs-mfa') {
    return (
      <Navigate
        to="/mfa-challenge"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  // AAL check failed (network/API error) — fail closed rather than get stuck
  if (aalStatus === 'error') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
