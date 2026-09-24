import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DangerZoneProps {
  /** Section heading — "Danger zone" text */
  label: string
  /** Title inside the expanded panel, e.g. "Delete this child's profile" */
  actionLabel: string
  /** Warning description shown below the title */
  description: string
  /** Label for the destructive confirm button */
  confirmLabel: string
  /** Called when the user confirms the action */
  onConfirm: () => Promise<void> | void
  /** Whether the async action is in progress */
  loading?: boolean
  /** Error message to surface inside the panel */
  error?: string | null
  /** Extra classes on the root element (e.g. mt-8, mb-4) */
  className?: string
}

export function DangerZone({
  label,
  actionLabel,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  error,
  className = '',
}: DangerZoneProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleToggle = () => {
    setOpen(o => !o)
    setConfirming(false)
  }

  return (
    <div className={`rounded-2xl border-2 border-red-200 overflow-hidden ${className}`}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-red-50 hover:bg-red-100 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm font-semibold text-red-700">{label}</span>
        </div>
        <svg
          className={`w-4 h-4 text-red-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white">
          {error && <p className="text-red-600 text-sm mb-3" role="alert">{error}</p>}
          <p className="text-sm font-semibold text-slate-800 mb-0.5">{actionLabel}</p>
          <p className="text-sm text-slate-500 mb-3">{description}</p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              {actionLabel}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl"
              >
                {loading ? t('common.loading') : confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
