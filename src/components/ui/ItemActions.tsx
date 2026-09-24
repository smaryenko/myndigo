import { useTranslation } from 'react-i18next'

interface Props {
  onEdit: () => void
  onDelete: () => void
}

export function ItemActions({ onEdit, onDelete }: Props) {
  const { t } = useTranslation()
  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-slate-400 hover:text-indigo-600"
      >
        {t('common.edit')}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-xs text-slate-400 hover:text-red-500"
      >
        {t('common.delete')}
      </button>
    </>
  )
}
