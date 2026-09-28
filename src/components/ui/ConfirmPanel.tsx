import { useTranslation } from 'react-i18next'
import { cx } from '../../lib/cx'
import { BTN_CANCEL, BTN_DANGER } from '../../lib/styles'

interface Props {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  /** 'danger' — destructive (red). 'warning' — reversible but notable (amber). */
  tone?: 'danger' | 'warning'
  /** Render the message + buttons inside a tinted box. */
  boxed?: boolean
  className?: string
}

const TONES = {
  danger: {
    box: 'border border-red-100 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    confirm: BTN_DANGER,
  },
  warning: {
    box: 'border border-amber-100 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    confirm: 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors',
  },
}

/**
 * The shared "are you sure?" UI: message + confirm + cancel. Used by
 * ConfirmAction, DangerZone, SectionCard's hide warning and item deletes,
 * so every confirmation in the app looks and behaves the same.
 */
export function ConfirmPanel({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  tone = 'danger',
  boxed = false,
  className,
}: Props) {
  const { t } = useTranslation()
  const styles = TONES[tone]
  return (
    <div role="group" aria-label={message} className={cx('space-y-2', boxed && `p-3 rounded-xl ${styles.box}`, className)}>
      <p className={cx('text-sm', styles.text)}>{message}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} disabled={loading} className={styles.confirm}>
          {loading ? t('common.loading') : confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className={BTN_CANCEL}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
