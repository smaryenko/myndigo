import { useTranslation } from 'react-i18next'
import { cx } from '../../lib/cx'

interface Props {
  /**
   * 'page' (default) — centered in the content area.
   * 'fullPage' — full-screen, for route-level loading outside a layout.
   * 'inline' — small spinner inside a card or button row.
   */
  variant?: 'page' | 'fullPage' | 'inline'
  /** Background for the fullPage variant. */
  className?: string
}

/** The one loading indicator used across the app. */
export function LoadingSpinner({ variant = 'page', className }: Props) {
  const { t } = useTranslation()
  const spinner = (
    <span role="status" className="inline-flex">
      <span
        aria-hidden="true"
        className={cx(
          'border-indigo-500 border-t-transparent rounded-full animate-spin',
          variant === 'inline' ? 'w-5 h-5 border-2' : 'w-8 h-8 border-4',
        )}
      />
      <span className="sr-only">{t('common.loading')}</span>
    </span>
  )

  if (variant === 'inline') return spinner

  if (variant === 'fullPage') {
    return (
      <div className={cx('min-h-screen flex items-center justify-center', className ?? 'bg-white')}>
        {spinner}
      </div>
    )
  }

  return <div className={cx('flex justify-center py-16', className)}>{spinner}</div>
}
