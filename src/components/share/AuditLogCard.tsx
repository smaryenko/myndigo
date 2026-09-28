import { useTranslation } from 'react-i18next'
import { SettingsCard } from '../ui/SettingsCard'
import { ConfirmAction } from '../ui/ConfirmAction'
import { InlineError } from '../ui/InlineError'
import { currentLanguage } from '../../lib/i18n'
import type { ShareAuditLogRow } from '../../lib/types'
import { useAuditLog } from './useAuditLog'

interface Props {
  childId: string
  initialEntries: ShareAuditLogRow[]
  initialTotal: number
}

/** "View history": who opened the shared page, when, and roughly where. */
export function AuditLogCard({ childId, initialEntries, initialTotal }: Props) {
  const { t } = useTranslation()
  const log = useAuditLog(childId, initialEntries, initialTotal)
  const remaining = Math.max(0, log.total - log.entries.length)

  const locationText = (entry: ShareAuditLogRow) => {
    if (entry.ip_city || entry.ip_country) return [entry.ip_city, entry.ip_country].filter(Boolean).join(', ')
    if (entry.latitude != null && entry.longitude != null) return `${entry.latitude.toFixed(2)}, ${entry.longitude.toFixed(2)}`
    return null
  }

  return (
    <SettingsCard>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-slate-800 whitespace-nowrap">{t('share.auditLog')}</h2>
        {log.total > 0 && (
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className="text-xs text-slate-400 whitespace-nowrap">{log.entries.length} / {log.total}</span>
            <ConfirmAction
              triggerLabel={t('share.clearHistory')}
              warningMessage={t('share.clearHistoryWarning')}
              confirmLabel={t('share.yesClearHistory')}
              onConfirm={log.clear}
              loading={log.clearing}
              triggerClassName="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
              expandBelow
            />
          </div>
        )}
      </div>

      <InlineError message={log.error} size="md" className="mb-3" />

      {log.entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{t('share.noViews')}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {log.entries.map(entry => {
              const location = locationText(entry)
              return (
                <li key={entry.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-lg" aria-hidden="true">👁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <time dateTime={entry.viewed_at}>{new Date(entry.viewed_at).toLocaleString(currentLanguage())}</time>
                    </p>
                    {entry.user_agent && (
                      <p className="text-xs text-slate-400 mt-0.5 break-all select-all" dir="ltr">{entry.user_agent}</p>
                    )}
                    {location && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span aria-hidden="true">📍 </span>{location}{' '}
                        <span className="text-slate-300">
                          ({entry.geo_source === 'browser' ? t('share.geoGps') : t('share.geoIp')})
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          {remaining > 0 && (
            <button
              type="button"
              onClick={log.loadMore}
              disabled={log.loadingMore}
              className="mt-4 w-full text-sm text-slate-500 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {log.loadingMore ? t('common.loading') : t('share.loadMore', { count: remaining })}
            </button>
          )}
        </>
      )}
    </SettingsCard>
  )
}
