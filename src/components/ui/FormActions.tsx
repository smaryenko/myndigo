import { useTranslation } from 'react-i18next'
import { BTN_PRIMARY_SM, BTN_PRIMARY_XS, BTN_SECONDARY_SM, BTN_SECONDARY_XS } from '../../lib/styles'

interface Props {
  onConfirm: () => void
  onCancel: () => void
  saving?: boolean
  disabled?: boolean
  confirmLabel?: string
  /** 'md' (default) — full-width add row. 'sm' — compact inline edit row. */
  size?: 'md' | 'sm'
}

/** Save/add + cancel button pair for inline add and edit forms. */
export function FormActions({
  onConfirm,
  onCancel,
  saving = false,
  disabled = false,
  confirmLabel,
  size = 'md',
}: Props) {
  const { t } = useTranslation()
  const compact = size === 'sm'
  const label = confirmLabel ?? (compact ? t('common.save') : t('common.add'))

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onConfirm}
        disabled={saving || disabled}
        className={compact ? BTN_PRIMARY_XS : BTN_PRIMARY_SM}
      >
        {saving ? t('common.saving') : label}
      </button>
      <button type="button" onClick={onCancel} disabled={saving} className={compact ? BTN_SECONDARY_XS : BTN_SECONDARY_SM}>
        {t('common.cancel')}
      </button>
    </div>
  )
}
