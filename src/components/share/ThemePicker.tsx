import { useTranslation } from 'react-i18next'
import { THEME_KEYS, type BuiltInTheme } from '../../lib/themes'
import { cx } from '../../lib/cx'
import type { ShareTheme } from '../../lib/types'

// Picker card styling per theme. Record<BuiltInTheme, …> so adding/removing a
// theme in lib/themes.ts is a compile error here until this is updated too
// (the shared page's own theme classes live in shared/sharedThemes.ts).
const PICKER: Record<BuiltInTheme, { emoji: string; bg: string; accent: string; border: string }> = {
  professional: { emoji: '🏥', bg: 'bg-slate-100', accent: 'bg-slate-800', border: 'border-slate-300' },
  warm:         { emoji: '🌸', bg: 'bg-amber-50', accent: 'bg-amber-500', border: 'border-amber-300' },
  playful:      { emoji: '🌈', bg: 'bg-violet-50', accent: 'bg-violet-500', border: 'border-violet-300' },
}

interface Props {
  value: ShareTheme
  onChange: (theme: BuiltInTheme) => void
  labelId: string
}

/** Visual picker for the shared page's theme. */
export function ThemePicker({ value, onChange, labelId }: Props) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby={labelId}>
      {THEME_KEYS.map(key => {
        const theme = PICKER[key]
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cx(
              'relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all text-center',
              active ? `${theme.border} ${theme.bg} shadow-sm` : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
            )}
          >
            <div className={cx('w-full h-1.5 rounded-full opacity-70', theme.accent)} aria-hidden="true" />
            <span className="text-lg leading-none" aria-hidden="true">{theme.emoji}</span>
            <span className={cx('text-xs font-semibold leading-tight', active ? 'text-slate-800' : 'text-slate-800 dark:text-slate-100')}>{t(`share.theme.${key}`)}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{t(`share.themeDesc.${key}`)}</span>
            {active && (
              <span className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-green-500 shadow flex items-center justify-center" aria-hidden="true">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
