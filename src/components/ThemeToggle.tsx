import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import { ICON_BTN } from '../lib/styles'
import { currentTheme, subscribeTheme, toggleTheme } from '../lib/theme'
import { IconTooltip } from './ui/IconTooltip'

interface Props {
  tooltipAlign?: 'center' | 'end'
  className?: string
}

/**
 * Round sun/moon button that flips light ↔ dark. Shows the moon in light mode
 * and the sun in dark mode, cross-fading with a small rotation.
 */
export function ThemeToggle({ tooltipAlign, className }: Props) {
  const { t } = useTranslation()
  const theme = useSyncExternalStore(subscribeTheme, currentTheme)
  const dark = theme === 'dark'
  const label = dark ? t('common.switchToLight') : t('common.switchToDark')

  const handleClick = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // View transitions give a smooth cross-fade where supported.
    if (!reduceMotion && 'startViewTransition' in document) {
      document.startViewTransition(toggleTheme)
    } else {
      toggleTheme()
    }
  }

  const icon = 'absolute inset-0 m-auto w-[1.1rem] h-[1.1rem] transition-all duration-300 ease-out motion-reduce:transition-none'

  return (
    <IconTooltip label={label} align={tooltipAlign}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={dark}
        aria-label={label}
        className={cx(ICON_BTN, 'transition-transform duration-300 hover:-rotate-[15deg] motion-reduce:hover:rotate-0', className)}
      >
        {/* Moon — visible in light mode */}
        <svg
          className={cx(icon, dark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        {/* Sun — visible in dark mode */}
        <svg
          className={cx(icon, dark ? 'opacity-100' : 'opacity-0 -rotate-90 scale-50')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>
    </IconTooltip>
  )
}
