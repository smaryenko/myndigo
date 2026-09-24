import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { SUPPORTED_LANGS } from '../lib/languages'
import { loadLanguage } from '../lib/i18n'
import { DangerZone } from '../components/ui/DangerZone'
import { SettingsCard } from '../components/ui/SettingsCard'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'

export function AccountPage() {
  const { t, i18n } = useTranslation()
  const { user, signOut, getAccessToken, getVerifiedTotpFactor, enrollTotp, challengeTotp, verifyTotp, unenrollTotp } = useAuth()
  const navigate = useNavigate()

  // ── MFA state ─────────────────────────────────────────────────────────────
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)
  const [confirmUnenroll, setConfirmUnenroll] = useState(false)

  // ── Language state ────────────────────────────────────────────────────────
  const [selectedLang, setSelectedLang] = useState(i18n.language.split('-')[0] ?? 'en')

  // ── Notification preferences — disabled (upcoming feature) ───────────────
  const prefsLoading = false

  // ── Danger zone ───────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Load MFA status ───────────────────────────────────────────────────────
  useEffect(() => {
    getVerifiedTotpFactor().then(verified => {
      setMfaEnabled(!!verified)
      if (verified) setFactorId(verified.id)
      setMfaLoading(false)
    })
  }, [getVerifiedTotpFactor])

  // ── Save notification preference — disabled (upcoming feature) ───────────

  // ── MFA: start enrolment ──────────────────────────────────────────────────
  const handleStartEnroll = async () => {
    setEnrolling(true)
    setVerifyError(null)
    const { data, error } = await enrollTotp()
    if (error || !data) {
      setVerifyError(error ?? t('common.error'))
      setEnrolling(false)
      return
    }
    setQrCode(data.totp.qr_code)
    setTotpSecret(data.totp.secret)
    setFactorId(data.id)
    setEnrolling(false)
  }

  // ── MFA: verify and activate ──────────────────────────────────────────────
  const handleVerifyEnroll = async () => {
    if (!factorId || verifyCode.length !== 6) return
    setVerifying(true)
    setVerifyError(null)

    const { challengeId, error: challengeErr } = await challengeTotp(factorId)
    if (challengeErr || !challengeId) {
      setVerifyError(challengeErr ?? t('common.error'))
      setVerifying(false)
      return
    }

    const { error: verifyErr } = await verifyTotp(factorId, challengeId, verifyCode)

    if (verifyErr) {
      setVerifyError(t('account.mfaIncorrectCode'))
      setVerifying(false)
      return
    }

    setMfaEnabled(true)
    setQrCode(null)
    setTotpSecret(null)
    setVerifyCode('')
    setVerifying(false)
  }

  // ── MFA: unenroll ─────────────────────────────────────────────────────────
  const handleUnenroll = async () => {
    if (!factorId) return
    setUnenrolling(true)
    const { error } = await unenrollTotp(factorId)
    if (error) { setVerifyError(error); setUnenrolling(false); return }
    setMfaEnabled(false)
    setFactorId(null)
    setConfirmUnenroll(false)
    setUnenrolling(false)
  }

  // ── Language change ───────────────────────────────────────────────────────
  const handleLangChange = async (code: string) => {
    setSelectedLang(code)
    await loadLanguage(code)
    i18n.changeLanguage(code)
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? t('common.deleteFailed'))
      }

      // User is deleted — sign out locally and redirect
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.deleteFailed'))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('account.title')}</h1>

      <SettingsCard title={t('account.sectionHeading')}>
        <p className="text-sm text-slate-700">
          <span className="font-medium">{t('account.email')}: </span>{user?.email}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {t('account.memberSince')} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        </p>
      </SettingsCard>

      {/* ── Language ────────────────────────────────────────────────────── */}
      <SettingsCard title={t('account.interfaceLanguage')}>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLangChange(lang.code)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedLang === lang.code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">{t('account.languageHint')}</p>
      </SettingsCard>

      {/* ── Notifications ───────────────────────────────────────────────── */}
      <SettingsCard title={t('account.notifications')}>
        {prefsLoading ? (
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">{t('account.notifyOnViewLabel')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('account.notifyOnViewHint')}</p>
              <p className="text-xs text-indigo-500 mt-1.5 font-medium">{t('account.upcomingFeature')}</p>
            </div>
            <ToggleSwitch enabled={false} disabled aria-label={t('account.toggleNotificationsLabel')} />
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4 border-t border-slate-50 pt-3">{t('account.notifyFootnote')}</p>
      </SettingsCard>

      {/* ── MFA ─────────────────────────────────────────────────────────── */}
      <SettingsCard title={t('account.mfa')}>

        {mfaLoading ? (
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : mfaEnabled ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-sm font-medium text-green-700">{t('account.mfaEnabled')}</span>
            </div>
            <p className="text-sm text-slate-500 mb-3">{t('account.mfaProtected')}</p>
            {!confirmUnenroll ? (
              <button
                type="button"
                onClick={() => setConfirmUnenroll(true)}
                className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
              >
                {t('account.mfaDisable')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-700">{t('account.mfaDisableConfirm')}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleUnenroll} disabled={unenrolling}
                    className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-xl disabled:opacity-50">
                    {unenrolling ? t('account.mfaDisabling') : t('account.mfaYesDisable')}
                  </button>
                  <button type="button" onClick={() => setConfirmUnenroll(false)}
                    className="border border-slate-200 text-slate-600 text-sm px-3 py-1.5 rounded-xl">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t('account.mfaScanQr')}</p>
            <div className="flex justify-center">
              <img src={qrCode} alt={t('common.qrCodeAlt')} className="w-40 h-40 rounded-xl border border-slate-200" />
            </div>
            {totpSecret && (
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500 mb-1">{t('account.mfaOrManual')}</p>
                <p className="font-mono text-sm text-slate-800 break-all">{totpSecret}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('account.mfaEnterCode')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {verifyError && <p className="text-red-600 text-sm" role="alert">{verifyError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVerifyEnroll}
                disabled={verifying || verifyCode.length !== 6}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {verifying ? t('account.mfaVerifying') : t('account.mfaActivate')}
              </button>
              <button
                type="button"
                onClick={() => { setQrCode(null); setTotpSecret(null); setVerifyCode('') }}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              <span className="text-sm text-slate-500">{t('account.mfaDisabled')}</span>
            </div>
            <p className="text-sm text-slate-500 mb-3">{t('account.mfaSecurityHint')}</p>
            {verifyError && <p className="text-red-600 text-sm mb-2" role="alert">{verifyError}</p>}
            <button
              type="button"
              onClick={handleStartEnroll}
              disabled={enrolling}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {enrolling ? t('account.mfaSettingUp') : t('account.setupMfa')}
            </button>
          </div>
        )}
      </SettingsCard>

      <DangerZone
        label={t('account.dangerZone')}
        actionLabel={t('account.deleteAccount')}
        description={t('account.deleteAccountWarning')}
        confirmLabel={t('account.deleteConfirmButton')}
        onConfirm={handleDeleteAccount}
        loading={deleting}
        error={error}
      />
    </div>
  )
}
