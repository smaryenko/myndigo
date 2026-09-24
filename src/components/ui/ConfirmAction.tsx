import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Label for the trigger button */
  triggerLabel: string
  /** Warning message shown before confirmation */
  warningMessage: string
  /** Label for the confirm button */
  confirmLabel: string
  /** Called when the user confirms */
  onConfirm: () => void | Promise<void>
  /** Loading state for the confirm action */
  loading?: boolean
  /** Extra classes for the trigger button */
  triggerClassName?: string
  /** Extra classes for the confirm button */
  confirmClassName?: string
  /**
   * When true, the trigger button stays visible and the confirm panel
   * expands below it instead of replacing it inline. Use this when the
   * trigger is inside a flex row that would break if its contents expand.
   */
  expandBelow?: boolean
}

export function ConfirmAction({
  triggerLabel,
  warningMessage,
  confirmLabel,
  onConfirm,
  loading = false,
  triggerClassName = 'text-sm text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors',
  confirmClassName = 'bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl',
  expandBelow = false,
}: Props) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  if (expandBelow) {
    return (
      <div>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={triggerClassName}>
            {triggerLabel}
          </button>
        )}
        {confirming && (
          <div className="mt-3 p-3 rounded-xl border border-red-100 bg-red-50 space-y-2">
            <p className="text-sm text-red-700">{warningMessage}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => { await onConfirm(); setConfirming(false) }}
                disabled={loading}
                className={confirmClassName}
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
          </div>
        )}
      </div>
    )
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={triggerClassName}>
        {triggerLabel}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-red-700">{warningMessage}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => { await onConfirm(); setConfirming(false) }}
          disabled={loading}
          className={confirmClassName}
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
    </div>
  )
}
