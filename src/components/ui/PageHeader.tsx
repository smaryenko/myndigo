import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  onBack: () => void
  /** Optional element rendered on the right side */
  action?: ReactNode
}

export function PageHeader({ title, onBack, action }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 text-sm"
        >
          <span aria-hidden="true" className="rtl:inline-block rtl:rotate-180">←</span>
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
