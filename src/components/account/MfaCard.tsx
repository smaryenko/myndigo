import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { enrollTotp, getVerifiedTotpFactorId, unenrollTotp, verifyTotpCode, type TotpEnrollment } from '../../lib/mfa'
import { toUserMessage } from '../../lib/errors'
import { BTN_DANGER_OUTLINE, BTN_PRIMARY, BTN_SECONDARY } from '../../lib/styles'
import { SettingsCard } from '../ui/SettingsCard'
import { ConfirmAction } from '../ui/ConfirmAction'
import { InlineError } from '../ui/InlineError'
import { LoadingSpinner } from '../ui/LoadingSpinner'

type State =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'enrolling'; enrollment: TotpEnrollment }
  | { kind: 'enabled'; factorId: string }

/** Two-factor authentication: status, TOTP enrolment and removal. */
export function MfaCard() {
  const { t } = useTranslation()
  const codeId = useId()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getVerifiedTotpFactorId()
      .then(id => { if (!cancelled) setState(id ? { kind: 'enabled', factorId: id } : { kind: 'disabled' }) })
      .catch(err => {
        if (cancelled) return
        setState({ kind: 'disabled' })
        setError(toUserMessage(err, t('common.error')))
      })
    return () => { cancelled = true }
  }, [t])

  const run = async (action: () => Promise<void>, fallback = t('common.error')) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(toUserMessage(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const startEnroll = () => run(async () => setState({ kind: 'enrolling', enrollment: await enrollTotp() }))

  const verify = (enrollment: TotpEnrollment) =>
    run(async () => {
      await verifyTotpCode(enrollment.factorId, code)
      setCode('')
      setState({ kind: 'enabled', factorId: enrollment.factorId })
    }, t('account.mfaIncorrectCode'))

  const disable = (factorId: string) =>
    run(async () => {
      await unenrollTotp(factorId)
      setState({ kind: 'disabled' })
    })

  return (
    <SettingsCard title={t('account.mfa')}>
      {state.kind === 'loading' && <LoadingSpinner variant="inline" />}

      {state.kind === 'enabled' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" aria-hidden="true" />
            <span className="text-sm font-medium text-green-700">{t('account.mfaEnabled')}</span>
          </div>
          <p className="text-sm text-slate-500 mb-3">{t('account.mfaProtected')}</p>
          <InlineError message={error} size="md" className="mb-2" />
          <ConfirmAction
            triggerLabel={t('account.mfaDisable')}
            warningMessage={t('account.mfaDisableConfirm')}
            confirmLabel={t('account.mfaYesDisable')}
            onConfirm={() => disable(state.factorId)}
            loading={busy}
            triggerClassName={BTN_DANGER_OUTLINE}
          />
        </div>
      )}

      {state.kind === 'enrolling' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('account.mfaScanQr')}</p>
          <div className="flex justify-center">
            <img src={state.enrollment.qrCode} alt={t('common.qrCodeAlt')} className="w-40 h-40 rounded-xl border border-slate-200" />
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-xs text-slate-500 mb-1">{t('account.mfaOrManual')}</p>
            <p className="font-mono text-sm text-slate-800 break-all" dir="ltr">{state.enrollment.secret}</p>
          </div>
          <div>
            <label htmlFor={codeId} className="block text-sm font-medium text-slate-700 mb-1">{t('account.mfaEnterCode')}</label>
            <input
              id={codeId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              dir="ltr"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <InlineError message={error} size="md" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => verify(state.enrollment)}
              disabled={busy || code.length !== 6}
              className={`flex-1 ${BTN_PRIMARY}`}
            >
              {busy ? t('account.mfaVerifying') : t('account.mfaActivate')}
            </button>
            <button
              type="button"
              onClick={() => { setState({ kind: 'disabled' }); setCode(''); setError(null) }}
              className={`flex-1 ${BTN_SECONDARY}`}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {state.kind === 'disabled' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" aria-hidden="true" />
            <span className="text-sm text-slate-500">{t('account.mfaDisabled')}</span>
          </div>
          <p className="text-sm text-slate-500 mb-3">{t('account.mfaSecurityHint')}</p>
          <InlineError message={error} size="md" className="mb-2" />
          <button type="button" onClick={startEnroll} disabled={busy} className={`px-4 ${BTN_PRIMARY}`}>
            {busy ? t('account.mfaSettingUp') : t('account.setupMfa')}
          </button>
        </div>
      )}
    </SettingsCard>
  )
}
