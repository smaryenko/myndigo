import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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

  const handleVisibilityToggle = () => {
    if (visible && hideWarning) {
      setConfirmingHide(true)
      return
    }
    onVisibilityChange(!visible)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b border-slate-50">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 text-left"
        >
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          <span className="text-slate-400 text-xs shrink-0">{collapsed ? '▸' : '▾'}</span>
        </button>

        {/* Visibility toggle — label always shown (not just on sm+): on mobile,
            the 👁/🙈 emoji pair alone reads as nearly identical at small size,
            so hiding the text left this control ambiguous on phones. Header
            wraps (flex-wrap) rather than truncating the section title when
            both don't fit on one line. */}
        <button
          type="button"
          onClick={handleVisibilityToggle}
          title={visible ? t('share.sectionVisible') : t('share.sectionHidden')}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 whitespace-nowrap ${
            visible
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-slate-200 bg-slate-50 text-slate-400'
          }`}
        >
          <span>{visible ? '👁' : '🙈'}</span>
          <span>{visible ? t('share.sectionVisible') : t('share.sectionHidden')}</span>
        </button>
      </div>

      {/* Warning modal */}
      {confirmingHide && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <p className="text-sm text-amber-800 mb-3">{hideWarning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onVisibilityChange(false); setConfirmingHide(false) }}
              className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
            >
              {t('share.hideAnyway')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingHide(false)}
              className="text-xs border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div className="px-4 py-4">
          {children}
        </div>
      )}
    </div>
  )
}
