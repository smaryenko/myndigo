import { useState } from 'react'
import { cx } from '../../lib/cx'
import { BTN_DANGER_OUTLINE } from '../../lib/styles'
import { ConfirmPanel } from './ConfirmPanel'

interface Props {
  /** Label for the trigger button */
  triggerLabel: string
  /** Warning message shown before confirmation */
  warningMessage: string
  /** Label for the confirm button */
  confirmLabel: string
  /**
   * Called when the user confirms. Should handle its own errors (show them
   * via InlineError); if it throws anyway, the panel simply stays open.
   */
  onConfirm: () => void | Promise<void>
  /** Loading state for the confirm action */
  loading?: boolean
  /** Classes for the trigger button */
  triggerClassName?: string
  /**
   * When true, the trigger stays visible and the confirm panel expands
   * below it (boxed) instead of replacing it inline — use inside flex rows.
   */
  expandBelow?: boolean
}

/** A trigger button that asks for confirmation before running a destructive action. */
export function ConfirmAction({
  triggerLabel,
  warningMessage,
  confirmLabel,
  onConfirm,
  loading = false,
  triggerClassName = BTN_DANGER_OUTLINE,
  expandBelow = false,
}: Props) {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      setConfirming(false)
    } catch (err) {
      console.error(err)
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-expanded={confirming}
      className={triggerClassName}
    >
      {triggerLabel}
    </button>
  )

  const panel = (
    <ConfirmPanel
      message={warningMessage}
      confirmLabel={confirmLabel}
      onConfirm={handleConfirm}
      onCancel={() => setConfirming(false)}
      loading={loading}
      boxed={expandBelow}
      className={cx(expandBelow && 'mt-3')}
    />
  )

  if (expandBelow) {
    return (
      <div>
        {!confirming && trigger}
        {confirming && panel}
      </div>
    )
  }

  return confirming ? panel : trigger
}
