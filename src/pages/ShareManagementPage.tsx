import { useId, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getShareManagementData,
  regenerateShareToken,
  setChildShareLanguage,
  setChildShareTheme,
  setChildSharing,
} from '../lib/db'
import { toUserMessage, userMessage } from '../lib/errors'
import { appUrl } from '../lib/appUrl'
import { SUPPORTED_LANGS } from '../lib/languages'
import { AUDIT_PAGE_SIZE } from '../lib/constants'
import { SELECT } from '../lib/styles'
import { useAsync } from '../hooks/useAsync'
import type { ChildRow } from '../lib/types'
import { AuditLogCard } from '../components/share/AuditLogCard'
import { QrCard } from '../components/share/QrCard'
import { ThemePicker } from '../components/share/ThemePicker'
import { DangerZone } from '../components/ui/DangerZone'
import { InlineError } from '../components/ui/InlineError'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { PageHeader } from '../components/ui/PageHeader'
import { SettingsCard } from '../components/ui/SettingsCard'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'

export function ShareManagementPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const langSelectId = useId()
  const themeLabelId = useId()

  const { data, setData, loading, error } = useAsync(
    id ? () => getShareManagementData(id, AUDIT_PAGE_SIZE) : null,
    id,
  )
  const [pending, setPending] = useState<'sharing' | 'regenerate' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (error || !data) {
    return <InlineError message={userMessage(error, t('share.notFound'))} size="md" className="text-center my-8" />
  }

  const { child } = data
  const childName = data.childName ?? t('share.childFallback')
  const shareUrl = appUrl(`/s/${child.share_token}`)
  const patchChild = (patch: Partial<ChildRow>) => setData(d => d && { ...d, child: { ...d.child, ...patch } })

  /**
   * Optimistically apply a change to the child, persist it, and roll back
   * (with an error banner) if the save fails.
   */
  const updateChild = async (patch: Partial<ChildRow>, save: () => Promise<unknown>) => {
    const previous = Object.fromEntries(Object.keys(patch).map(k => [k, child[k as keyof ChildRow]])) as Partial<ChildRow>
    setActionError(null)
    patchChild(patch)
    try {
      await save()
    } catch (err) {
      patchChild(previous)
      setActionError(toUserMessage(err, t('common.saveFailed')))
    }
  }

  const handleToggleSharing = async () => {
    setPending('sharing')
    await updateChild({ sharing_enabled: !child.sharing_enabled }, () => setChildSharing(child.id, !child.sharing_enabled))
    setPending(null)
  }

  const handleRegenerate = async () => {
    setActionError(null)
    setPending('regenerate')
    try {
      patchChild({ share_token: await regenerateShareToken(child.id) })
    } catch (err) {
      setActionError(toUserMessage(err, t('common.saveFailed')))
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <PageHeader title={`${t('share.title')} — ${childName}`} onBack={() => navigate(`/children/${id}`)} />

      <InlineError message={actionError} size="md" className="mb-4" />

      <SettingsCard className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">
              {child.sharing_enabled ? t('share.sharingOn') : t('share.sharingOff')}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {child.sharing_enabled ? t('share.sharingOnHint') : t('share.sharingOffHint')}
            </p>
          </div>
          <ToggleSwitch
            enabled={child.sharing_enabled}
            onChange={handleToggleSharing}
            disabled={pending === 'sharing'}
            label={child.sharing_enabled ? t('share.disableSharing') : t('share.enableSharing')}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50">
          <label htmlFor={langSelectId} className="block text-sm font-medium text-slate-700 mb-2">
            {t('share.defaultLanguage')}
          </label>
          <select
            id={langSelectId}
            value={child.share_language || 'en'}
            onChange={e => {
              const lang = e.target.value
              void updateChild({ share_language: lang }, () => setChildShareLanguage(child.id, lang))
            }}
            aria-describedby={`${langSelectId}-hint`}
            className={SELECT}
          >
            {SUPPORTED_LANGS.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.short} — {lang.label}</option>
            ))}
          </select>
          <p id={`${langSelectId}-hint`} className="text-xs text-slate-400 mt-1.5">{t('share.defaultLanguageHint')}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50">
          <p id={themeLabelId} className="block text-sm font-medium text-slate-700 mb-3">{t('share.themeLabel')}</p>
          <ThemePicker
            labelId={themeLabelId}
            value={child.share_theme}
            onChange={theme => updateChild({ share_theme: theme }, () => setChildShareTheme(child.id, theme))}
          />
        </div>
      </SettingsCard>

      <QrCard shareUrl={shareUrl} childName={childName} sharingEnabled={child.sharing_enabled} />

      <DangerZone
        className="mb-4"
        label={t('child.dangerZone')}
        actionLabel={t('share.invalidateQrTitle')}
        description={t('share.invalidateQrHint')}
        confirmLabel={t('share.yesRegenerate')}
        onConfirm={handleRegenerate}
        loading={pending === 'regenerate'}
      />

      <AuditLogCard key={child.id} childId={child.id} initialEntries={data.auditLog} initialTotal={data.auditTotal} />
    </div>
  )
}
