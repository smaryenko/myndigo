import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { deleteAccount } from '../lib/db'
import { toUserMessage } from '../lib/errors'
import { currentLanguage, setLanguage } from '../lib/i18n'
import { SUPPORTED_LANGS } from '../lib/languages'
import { cx } from '../lib/cx'
import { PILL, PILL_ACTIVE, PILL_INACTIVE } from '../lib/styles'
import { MfaCard } from '../components/account/MfaCard'
import { DangerZone } from '../components/ui/DangerZone'
import { SettingsCard } from '../components/ui/SettingsCard'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'

export function AccountPage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const selectedLang = currentLanguage()

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(toUserMessage(err, t('common.deleteFailed')))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">{t('account.title')}</h1>

      <SettingsCard title={t('account.sectionHeading')}>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">{t('account.email')}: </span>{user?.email}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {t('account.memberSince')} {user?.created_at ? new Date(user.created_at).toLocaleDateString(selectedLang) : '—'}
        </p>
      </SettingsCard>

      <SettingsCard title={t('account.interfaceLanguage')}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('account.interfaceLanguage')}>
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={selectedLang === lang.code}
              lang={lang.code}
              onClick={() => void setLanguage(lang.code, { persist: true })}
              className={cx(PILL, selectedLang === lang.code ? PILL_ACTIVE : PILL_INACTIVE)}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">{t('account.languageHint')}</p>
      </SettingsCard>

      {/* Notification preferences — not yet user-configurable (upcoming feature). */}
      <SettingsCard title={t('account.notifications')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('account.notifyOnViewLabel')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('account.notifyOnViewHint')}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1.5 font-medium">{t('account.upcomingFeature')}</p>
          </div>
          <ToggleSwitch enabled={false} disabled label={t('account.toggleNotificationsLabel')} />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 border-t border-slate-50 dark:border-slate-700 pt-3">{t('account.notifyFootnote')}</p>
      </SettingsCard>

      <MfaCard />

      <DangerZone
        label={t('account.dangerZone')}
        actionLabel={t('account.deleteAccount')}
        description={t('account.deleteAccountWarning')}
        confirmLabel={t('account.deleteConfirmButton')}
        onConfirm={handleDeleteAccount}
        loading={deleting}
        error={deleteError}
      />
    </div>
  )
}
