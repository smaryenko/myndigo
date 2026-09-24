import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const { session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setSubmitting(true)

    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail
    const { error } = await fn(email, password)

    if (error) {
      // Strip any JWT tokens from error messages before showing them in the UI.
      // Supabase's PKCE flow can surface raw access tokens in error strings on
      // first login — safe to replace with a generic fallback.
      const sanitised = error.replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/]*/g, '[token]')
      const isOnlyToken = sanitised.trim() === '[token]' || sanitised.trim() === ''
      setError(isOnlyToken ? t('common.error') : sanitised)
    } else if (mode === 'signup') {
      setSuccessMsg(t('auth.checkEmail'))
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 tracking-tight">
            {t('common.appName')}
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            {mode === 'signin' ? t('auth.tagline') : t('auth.signUpTagline')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          {mode === 'signup' && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-indigo-700">{t('auth.signUpTitle')}</p>
              <p className="text-xs text-indigo-500 mt-0.5">{t('auth.noAccount').replace('?', '')} — {t('auth.signUp')}</p>
            </div>
          )}
          {/* Google OAuth */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <GoogleIcon />
            {mode === 'signin' ? t('auth.signInWithGoogle') : t('auth.signUpWithGoogle')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <div className="flex-1 h-px bg-slate-100" />
            {t('auth.orContinueWith')}
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm" role="alert">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="text-green-600 text-sm" role="status">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {submitting
                ? t('common.loading')
                : mode === 'signin'
                  ? t('auth.signIn')
                  : t('auth.signUp')}
            </button>
          </form>

          {/* Toggle signin / signup */}
          <p className="text-center text-sm text-slate-500">
            {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button
              type="button"
              onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  )
}
