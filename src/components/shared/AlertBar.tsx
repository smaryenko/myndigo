import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { alertEmoji, alertLabel, alertSeverity } from '../../lib/alerts'
import { fieldPath } from '../../lib/fieldPath'
import { cx } from '../../lib/cx'
import type { SharedProfileEntry, SharedSection } from '../../lib/types'
import type { ThemeConfig } from './sharedThemes'
import type { Tx } from './sharedModel'

interface BadgeProps {
  section: SharedSection
  alert: SharedProfileEntry
  tx: Tx
  theme: ThemeConfig
}

export function AlertBadge({ section, alert, tx, theme }: BadgeProps) {
  const { t } = useTranslation()
  const [showNote, setShowNote] = useState(false)
  const options = section.fields.find(f => f.field_key === 'alert_type')?.options
  const customLabel = typeof alert.values.label === 'string' ? alert.values.label.trim() : ''
  const label = alertLabel(
    alert.values,
    options,
    t,
    customLabel ? tx(fieldPath(section.section_key, alert.id, 'label'), customLabel) : undefined,
  )
  const rawNote = typeof alert.values.note === 'string' ? alert.values.note.trim() : ''
  const note = rawNote ? tx(fieldPath(section.section_key, alert.id, 'note'), rawNote) : null
  const badgeClass = cx(
    'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide',
    alertSeverity(alert.values) === 'red' ? theme.alertBadgeRed : theme.alertBadgeOrange,
  )

  return (
    <div>
      {note ? (
        <button type="button" onClick={() => setShowNote(n => !n)} aria-expanded={showNote} className={badgeClass}>
          <span aria-hidden="true">{alertEmoji(alert.values)}</span> {label}
          <span className="ms-1 opacity-70" aria-hidden="true">›</span>
        </button>
      ) : (
        <span className={cx(badgeClass, 'inline-block')}>
          <span aria-hidden="true">{alertEmoji(alert.values)}</span> {label}
        </span>
      )}
      {showNote && note && (
        <div className="mt-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 shadow-sm">
          {note}
        </div>
      )}
    </div>
  )
}

interface BarProps {
  section: SharedSection
  alerts: SharedProfileEntry[]
  tx: Tx
  theme: ThemeConfig
  /** How many badges fit in the bar; the rest are counted. */
  limit?: number
}

/** Always-first alert banner. */
export function AlertBar({ section, alerts, tx, theme, limit = 3 }: BarProps) {
  const { t } = useTranslation()
  if (alerts.length === 0) return null
  return (
    <section aria-label={t('sharedPage.alerts')} className={cx('mx-4 mt-2 mb-2 px-4 py-3.5', theme.alertBar)}>
      <h2 className={cx('text-xs font-semibold uppercase tracking-widest mb-2.5', theme.alertHeading)}>
        <span aria-hidden="true">⚠️</span> {t('sharedPage.alerts')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {alerts.slice(0, limit).map(alert => (
          <AlertBadge key={alert.id} section={section} alert={alert} tx={tx} theme={theme} />
        ))}
        {alerts.length > limit && (
          <span className={cx('text-xs self-center', theme.alertHeading)}>
            {t('sharedPage.moreAlerts', { count: alerts.length - limit })}
          </span>
        )}
      </div>
    </section>
  )
}
