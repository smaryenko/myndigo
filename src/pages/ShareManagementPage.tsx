import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  setChildSharing,
  regenerateShareToken,
  clearAuditLog,
  setChildShareLanguage,
  setChildShareTheme,
  getAuditLogPage,
  getShareManagementData,
} from '../lib/db'
import { SUPPORTED_LANGS } from '../lib/languages'
import { AUDIT_PAGE_SIZE } from '../lib/constants'

import { ConfirmAction } from '../components/ui/ConfirmAction'
import { DangerZone } from '../components/ui/DangerZone'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { SettingsCard } from '../components/ui/SettingsCard'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'
import { PageHeader } from '../components/ui/PageHeader'
import { BadgePreviewModal } from '../components/BadgePreviewModal'

import type { ChildRow, ShareAuditLogRow, ShareTheme } from '../lib/types'
import { THEME_KEYS, type BuiltInTheme } from '../lib/themes'

// Theme preview config — used for the visual picker cards.
// Typed as Record<BuiltInTheme, ...> (rather than a plain array) so adding
// or removing a theme in themes.ts causes a compile error here until this
// picker config is updated too — keeps this in sync with SharedProfilePage's
// THEMES without forcing both files to share the same styling values.
const SHARE_THEME_CONFIG: Record<BuiltInTheme, { emoji: string; labelKey: string; descKey: string; bg: string; accent: string; border: string }> = {
  professional: {
    emoji: '🏥',
    labelKey: 'share.theme.professional',
    descKey: 'share.themeDesc.professional',
    bg: 'bg-slate-100',
    accent: 'bg-slate-800',
    border: 'border-slate-300',
  },
  warm: {
    emoji: '🌸',
    labelKey: 'share.theme.warm',
    descKey: 'share.themeDesc.warm',
    bg: 'bg-amber-50',
    accent: 'bg-amber-500',
    border: 'border-amber-300',
  },
  playful: {
    emoji: '🌈',
    labelKey: 'share.theme.playful',
    descKey: 'share.themeDesc.playful',
    bg: 'bg-violet-50',
    accent: 'bg-violet-500',
    border: 'border-violet-300',
  },
}

const SHARE_THEMES = THEME_KEYS.map(value => ({ value, ...SHARE_THEME_CONFIG[value] }))

export function ShareManagementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [child, setChild] = useState<ChildRow | null>(null)
  const [childName, setChildName] = useState('')
  const [auditLog, setAuditLog] = useState<ShareAuditLogRow[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getShareManagementData(id, AUDIT_PAGE_SIZE)
      .then(data => {
        setChild(data.child)
        setChildName(data.childName ?? t('share.childFallback'))
        setAuditLog(data.auditLog)
        setAuditTotal(data.auditTotal)
      })
      .catch(err => setError(err instanceof Error ? err.message : t('share.notFound')))
      .finally(() => setLoading(false))
  }, [id])

  const shareUrl = child
    ? `${window.location.origin}/s/${child.share_token}`
    : ''

  const handleToggleSharing = async () => {
    if (!child) return
    setActionError(null)
    setToggling(true)
    try {
      await setChildSharing(child.id, !child.sharing_enabled)
      setChild(c => c ? { ...c, sharing_enabled: !c.sharing_enabled } : c)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('share.notFound'))
    } finally {
      setToggling(false)
    }
  }

  const handleShareLanguageChange = async (lang: string) => {
    if (!child) return
    setActionError(null)
    const previous = child.share_language
    setChild(c => c ? { ...c, share_language: lang } : c)
    try {
      await setChildShareLanguage(child.id, lang)
    } catch (err) {
      setChild(c => c ? { ...c, share_language: previous } : c)
      setActionError(err instanceof Error ? err.message : t('share.notFound'))
    }
  }

  const handleShareThemeChange = async (theme: ShareTheme) => {
    if (!child) return
    setActionError(null)
    const previous = child.share_theme
    setChild(c => c ? { ...c, share_theme: theme } : c)
    try {
      await setChildShareTheme(child.id, theme)
    } catch (err) {
      setChild(c => c ? { ...c, share_theme: previous } : c)
      setActionError(err instanceof Error ? err.message : t('share.notFound'))
    }
  }

  const handleRegenerate = async () => {
    if (!child) return
    setActionError(null)
    setRegenerating(true)
    try {
      const newToken = await regenerateShareToken(child.id)
      setChild(c => c ? { ...c, share_token: newToken } : c)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('share.notFound'))
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQr = () => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    // Stamp size and white background so the downloaded file is self-contained
    const size = 512
    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute('width', String(size))
    clone.setAttribute('height', String(size))
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    // Prepend a white background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', '100%')
    bg.setAttribute('height', '100%')
    bg.setAttribute('fill', 'white')
    clone.insertBefore(bg, clone.firstChild)

    const svgStr = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `myndigo-qr-${childName.replace(/\s+/g, '-').toLowerCase()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearHistory = async () => {
    if (!child) return
    setActionError(null)
    setClearingHistory(true)
    try {
      await clearAuditLog(child.id)
      setAuditLog([])
      setAuditTotal(0)
      setAuditPage(1)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('share.notFound'))
    } finally {
      setClearingHistory(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !child) {
    return <p className="text-red-600 text-sm text-center py-8">{error ?? t('share.notFound')}</p>
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={`${t('share.title')} — ${childName}`}
        onBack={() => navigate(`/children/${id}`)}
      />

      {actionError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {actionError}
        </p>
      )}

      {/* Sharing toggle */}
      <SettingsCard className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">
              {child.sharing_enabled ? t('share.sharingOn') : t('share.sharingOff')}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {child.sharing_enabled
                ? t('share.sharingOnHint')
                : t('share.sharingOffHint')}
            </p>
          </div>
          <ToggleSwitch
            enabled={child.sharing_enabled}
            onChange={handleToggleSharing}
            disabled={toggling}
            label={child.sharing_enabled ? t('share.sharingOn') : t('share.sharingOff')}
          />
        </div>

        {/* Default language for shared card */}
        <div className="mt-4 pt-4 border-t border-slate-50">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('share.defaultLanguage')}
          </label>
          <select
            value={child.share_language ?? 'en'}
            onChange={e => handleShareLanguageChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
          >
            {SUPPORTED_LANGS.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.short} — {lang.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1.5">{t('share.defaultLanguageHint')}</p>
        </div>

        {/* Theme picker */}
        <div className="mt-4 pt-4 border-t border-slate-50">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            {t('share.themeLabel')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SHARE_THEMES.map(theme => {
              const active = (child.share_theme ?? 'professional') === theme.value
              return (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => handleShareThemeChange(theme.value)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all text-center ${
                    active
                      ? `${theme.border} ${theme.bg} shadow-sm`
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  {/* Mini preview strip */}
                  <div className={`w-full h-1.5 rounded-full ${theme.accent} opacity-70`} />
                  <span className="text-lg leading-none">{theme.emoji}</span>
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{t(theme.labelKey)}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{t(theme.descKey)}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 shadow flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </SettingsCard>

      {/* QR Code */}
      <SettingsCard title={t('share.qrCode')} className="mb-4">
        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className={`p-4 rounded-2xl border-2 ${child.sharing_enabled ? 'border-indigo-100' : 'border-slate-100 opacity-50'}`}>
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
          {!child.sharing_enabled && (
            <p className="text-xs text-amber-600 text-center">{t('share.qrInactiveHint')}</p>
          )}

          {/* Copy link + Open */}
          <div className="w-full flex flex-wrap gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 bg-slate-50 focus:outline-none"
            />
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0"
              title="Open in new tab"
            >
              ↗
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 min-w-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-colors text-center"
            >
              {copied ? t('share.linkCopied') : t('share.copyLink')}
            </button>
          </div>

          {/* Download QR */}
          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('share.downloadQr')}
          </button>

          {/* Print Badge */}
          <button
            type="button"
            onClick={() => setBadgeOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-amber-700 border border-amber-200 bg-amber-50 rounded-xl py-2 hover:bg-amber-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h4m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('share.printBadge')}
          </button>
        </div>
      </SettingsCard>

      <DangerZone
        className="mb-4"
        label={t('child.dangerZone')}
        actionLabel={t('share.invalidateQrTitle')}
        description={t('share.invalidateQrHint')}
        confirmLabel={t('share.yesRegenerate')}
        onConfirm={handleRegenerate}
        loading={regenerating}
      />

      {/* Audit log */}
      <SettingsCard>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-slate-800 whitespace-nowrap">{t('share.auditLog')}</h2>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {auditTotal > 0 && (
                <span className="text-xs text-slate-400 whitespace-nowrap">{auditLog.length} / {auditTotal}</span>
              )}
              {auditTotal > 0 && (
                <ConfirmAction
                  triggerLabel={t('share.clearHistory')}
                  warningMessage={t('share.clearHistoryWarning')}
                  confirmLabel={t('share.yesClearHistory')}
                  onConfirm={handleClearHistory}
                  loading={clearingHistory}
                  triggerClassName="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                  confirmClassName="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl"
                  expandBelow
                />
              )}
            </div>
          </div>
        </div>
        {auditLog.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">{t('share.noViews')}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {auditLog.map(entry => (
                <li key={entry.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-lg">👁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      {new Date(entry.viewed_at).toLocaleString()}
                    </p>
                    {entry.user_agent && (
                      <p className="text-xs text-slate-400 mt-0.5 break-all select-all">{entry.user_agent}</p>
                    )}
                    {(entry.ip_city || entry.ip_country || (entry.latitude && entry.longitude)) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        📍 {entry.ip_city || entry.ip_country
                          ? [entry.ip_city, entry.ip_country].filter(Boolean).join(', ')
                          : `${entry.latitude!.toFixed(2)}, ${entry.longitude!.toFixed(2)}`}
                        {' '}
                        <span className="text-slate-300">
                          ({entry.geo_source === 'browser' ? 'GPS' : 'approx. via IP'})
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {auditLog.length < auditTotal && (
              <button
                type="button"
                onClick={async () => {
                  if (!id) return
                  setActionError(null)
                  setLoadingMore(true)
                  const nextPage = auditPage + 1
                  try {
                    const data = await getAuditLogPage(id, nextPage, AUDIT_PAGE_SIZE)
                    setAuditLog(prev => [...prev, ...data])
                    setAuditPage(nextPage)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : t('share.notFound'))
                  } finally {
                    setLoadingMore(false)
                  }
                }}
                disabled={loadingMore}
                className="mt-4 w-full text-sm text-slate-500 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? t('common.loading') : `${t('sharedPage.expandSection')} (${auditTotal - auditLog.length} more)`}
              </button>
            )}
          </>
        )}
      </SettingsCard>
      {/* Badge preview modal */}
      {badgeOpen && (
        <BadgePreviewModal
          childName={childName}
          shareUrl={shareUrl}
          onClose={() => setBadgeOpen(false)}
        />
      )}
    </div>
  )
}
