import { useTranslation } from 'react-i18next'
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM } from '../../lib/cn'

// Small class constants for the inline edit save/cancel row (xs text, no flex-1)
const BTN_PRIMARY_XS = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors'
const BTN_SECONDARY_XS = 'border border-slate-200 text-slate-500 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50'

interface Props {
  onConfirm: () => void
  onCancel: () => void
  saving?: boolean
  disabled?: boolean
  confirmLabel?: string
  /** 'md' (default) — full-width add row. 'sm' — compact inline edit row. */
  size?: 'md' | 'sm'
}

export function FormActions({
  onConfirm,
  onCancel,
  saving = false,
  disabled = false,
  confirmLabel,
  size = 'md',
}: Props) {
  const { t } = useTranslation()

  if (size === 'sm') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || disabled}
          className={BTN_PRIMARY_XS}
        >
          {saving ? '…' : (confirmLabel ?? t('common.save'))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={BTN_SECONDARY_XS}
        >
          {t('common.cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onConfirm}
        disabled={saving || disabled}
        className={BTN_PRIMARY_SM}
      >
        {saving ? '…' : (confirmLabel ?? t('common.add'))}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={BTN_SECONDARY_SM}
      >
        {t('common.cancel')}
      </button>
    </div>
  )
}
