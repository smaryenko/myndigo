import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { getVerifiedTotpFactorId, verifyTotpCode } from '../lib/mfa'
import { BTN_PRIMARY } from '../lib/styles'
import { InlineError } from '../components/ui/InlineError'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export function MfaChallengePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Where to send the user after successful verification
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  useEffect(() => {
    let cancelled = false
    getVerifiedTotpFactorId()
      .then(id => {
        if (cancelled) return
        if (id) setFactorId(id)
        else navigate('/dashboard', { replace: true }) // no enrolled factor — nothing to challenge
      })
      .catch(err => {
        // Without this the page sat on a spinner forever; send them to log in again.
        console.error('MFA: listing factors failed:', err)
        if (!cancelled) navigate('/login', { replace: true })
      })
    return () => { cancelled = true }
  }, [navigate])

  const handleVerify = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!factorId || code.length !== 6) return
    setVerifying(true)
    setError(null)
    try {
      await verifyTotpCode(factorId, code)
      navigate(from, { replace: true })
    } catch (err) {
      // A wrong code is by far the common case — show that message rather
      // than the raw auth error.
      console.error('MFA verify failed:', err)
      setError(t('account.mfaChallengeError'))
      setCode('')
      setVerifying(false)
    }
  }

  if (!factorId) return <LoadingSpinner variant="fullPage" className="bg-slate-50 dark:bg-slate-950" />

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <form onSubmit={handleVerify} className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 p-8 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">{t('account.mfaChallengeTitle')}</h1>
        <p id="mfa-hint" className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{t('account.mfaChallengeHint')}</p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={e => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError(null)
          }}
          placeholder="000000"
          autoFocus
          dir="ltr"
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3 bg-white text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:placeholder:text-slate-600 dark:focus:ring-indigo-500"
          aria-label={t('account.mfaEnterCode')}
          aria-describedby="mfa-hint"
        />

        <InlineError message={error} size="md" className="mb-3 text-center" />

        <button type="submit" disabled={verifying || code.length !== 6} className={`w-full py-3 ${BTN_PRIMARY}`}>
          {verifying ? t('account.mfaChallengeVerifying') : t('account.mfaChallengeVerify')}
        </button>

        <button
          type="button"
          onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
          className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </form>
    </main>
  )
}
