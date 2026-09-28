import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { needsMfaStepUp } from '../lib/mfa'
import { LoadingSpinner } from './ui/LoadingSpinner'

type AalStatus = 'loading' | 'ok' | 'needs-mfa' | 'error'

/**
 * Gate for signed-in routes: requires a session, and an MFA step-up when
 * the user has TOTP enrolled. The AAL check is tied to the user id, so
 * signing in as someone else re-checks instead of reusing the previous
 * user's result, and routine token refreshes don't re-run it.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const userId = user?.id ?? null
  const [aal, setAal] = useState<{ userId: string | null; status: AalStatus }>({ userId: null, status: 'loading' })

  useEffect(() => {
    if (loading || !userId) return
    let cancelled = false
    needsMfaStepUp()
      .then(needs => { if (!cancelled) setAal({ userId, status: needs ? 'needs-mfa' : 'ok' }) })
      .catch(err => {
        // Fail closed: send them to login rather than silently granting access.
        console.error('ProtectedRoute: AAL check failed:', err)
        if (!cancelled) setAal({ userId, status: 'error' })
      })
    return () => { cancelled = true }
  }, [loading, userId])

  if (loading) return <LoadingSpinner variant="fullPage" className="bg-slate-50 dark:bg-slate-950" />
  if (!userId) return <Navigate to="/login" replace />

  const status: AalStatus = aal.userId === userId ? aal.status : 'loading'
  if (status === 'loading') return <LoadingSpinner variant="fullPage" className="bg-slate-50 dark:bg-slate-950" />
  if (status === 'needs-mfa') return <Navigate to="/mfa-challenge" replace state={{ from: location.pathname }} />
  if (status === 'error') return <Navigate to="/login" replace />

  return <Outlet />
}
