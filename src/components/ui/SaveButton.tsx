import { useTranslation } from 'react-i18next'
import { BTN_PRIMARY } from '../../lib/cn'

interface Props {
  saving: boolean
  saved: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}

export function SaveButton({ saving, saved, disabled = false, onClick, className }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className={`w-full ${BTN_PRIMARY} ${className ?? ''}`}
    >
      {saved ? t('common.saved') : saving ? t('common.loading') : t('common.save')}
    </button>
  )
}
