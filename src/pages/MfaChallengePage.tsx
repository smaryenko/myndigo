import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'

export function MfaChallengePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { getVerifiedTotpFactor, challengeTotp, verifyTotp, signOut } = useAuth()

  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Where to send the user after successful verification
  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  // Load the verified TOTP factor on mount
  useEffect(() => {
    getVerifiedTotpFactor().then(verified => {
      if (verified) {
        setFactorId(verified.id)
      } else {
        // No enrolled factor — shouldn't be here, redirect to dashboard
        navigate('/dashboard', { replace: true })
      }
    })
  }, [navigate, getVerifiedTotpFactor])

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return
    setVerifying(true)
    setError(null)

    const { challengeId, error: challengeErr } = await challengeTotp(factorId)
    if (challengeErr || !challengeId) {
      setError(challengeErr ?? t('common.error'))
      setVerifying(false)
      return
    }

    const { error: verifyErr } = await verifyTotp(factorId, challengeId, code)

    if (verifyErr) {
      setError(t('account.mfaChallengeError'))
      setCode('')
      setVerifying(false)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-800 text-center mb-2">
          {t('account.mfaChallengeTitle')}
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          {t('account.mfaChallengeHint')}
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError(null)
          }}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="000000"
          autoFocus
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
          aria-label={t('account.mfaChallengeTitle')}
        />

        {error && (
          <p className="text-red-600 text-sm text-center mb-3" role="alert">{error}</p>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || code.length !== 6}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {verifying ? t('account.mfaChallengeVerifying') : t('account.mfaChallengeVerify')}
        </button>

        <button
          type="button"
          onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
          className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </div>
  )
}
