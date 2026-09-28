import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../lib/cx'
import { ConfirmPanel } from '../ui/ConfirmPanel'

interface SectionCardProps {
  title: string
  /** Current visibility on the shared page */
  visible: boolean
  onVisibilityChange: (visible: boolean) => void
  /** Show a warning before hiding (e.g. alerts section) */
  hideWarning?: string
  children: ReactNode
  /** Start collapsed? */
  defaultCollapsed?: boolean
}

/** Collapsible editor card with a shared-page visibility toggle in its header. */
export function SectionCard({
  title,
  visible,
  onVisibilityChange,
  hideWarning,
  children,
  defaultCollapsed = false,
}: SectionCardProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [confirmingHide, setConfirmingHide] = useState(false)
  const contentId = useId()
  const visibilityLabel = visible ? t('share.sectionVisible') : t('share.sectionHidden')

  const handleVisibilityToggle = () => {
    if (visible && hideWarning) {
      setConfirmingHide(true)
      return
    }
    onVisibilityChange(!visible)
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700" aria-label={title}>
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b border-slate-50 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className="flex items-center gap-2 text-left"
        >
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h2>
          <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        </button>

        {/* Visibility toggle — label always shown (the 👁/🙈 emoji pair alone
            is ambiguous at small sizes). Header wraps rather than truncating. */}
        <button
          type="button"
          onClick={handleVisibilityToggle}
          aria-pressed={visible}
          aria-label={`${title}: ${visibilityLabel}`}
          className={cx(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 whitespace-nowrap',
            visible ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400',
          )}
        >
          <span aria-hidden="true">{visible ? '👁' : '🙈'}</span>
          <span>{visibilityLabel}</span>
        </button>
      </div>

      {confirmingHide && hideWarning && (
        <ConfirmPanel
          tone="warning"
          message={hideWarning}
          confirmLabel={t('share.hideAnyway')}
          onConfirm={() => { onVisibilityChange(false); setConfirmingHide(false) }}
          onCancel={() => setConfirmingHide(false)}
          className="bg-amber-50 border-b border-amber-100 px-4 py-3 dark:bg-amber-950/30 dark:border-amber-900"
        />
      )}

      {!collapsed && (
        <div id={contentId} className="px-4 py-4">
          {children}
        </div>
      )}
    </section>
  )
}
