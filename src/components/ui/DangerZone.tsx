import { useId, useState } from 'react'
import { cx } from '../../lib/cx'
import { ConfirmAction } from './ConfirmAction'
import { InlineError } from './InlineError'

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

/** Collapsible red card holding one destructive action behind a confirmation. */
export function DangerZone({
  label,
  actionLabel,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  error,
  className,
}: DangerZoneProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={cx('rounded-2xl border-2 border-red-200 overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-red-50 hover:bg-red-100 transition-colors text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm font-semibold text-red-700">{label}</span>
        </div>
        <svg
          className={cx('w-4 h-4 text-red-400 transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="px-5 py-4 bg-white">
          <InlineError message={error} size="md" className="mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-0.5">{actionLabel}</p>
          <p className="text-sm text-slate-500 mb-3">{description}</p>
          <ConfirmAction
            triggerLabel={actionLabel}
            warningMessage={description}
            confirmLabel={confirmLabel}
            onConfirm={onConfirm}
            loading={loading}
          />
        </div>
      )}
    </div>
  )
}
