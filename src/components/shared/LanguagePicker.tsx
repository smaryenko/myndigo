import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGS } from '../../lib/languages'
import { cx } from '../../lib/cx'
import type { ThemeConfig } from './sharedThemes'

interface Props {
  value: string
  onChange: (lang: string) => void
  translating: boolean
  theme: ThemeConfig
}

/** Viewer language menu for the shared page. Closes on Escape and outside click. */
export function LanguagePicker({ value, onChange, translating, theme }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = SUPPORTED_LANGS.find(l => l.code === value)

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('sharedPage.language')}: ${current?.label ?? value}`}
        className={cx('flex items-center gap-1.5 text-xs text-slate-500 rounded-md px-2.5 py-1.5 dark:text-slate-400', theme.langBtn)}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        {current?.label ?? value}
        {translating && (
          <span className="ms-1 w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block dark:border-slate-500" aria-hidden="true" />
        )}
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('sharedPage.language')}
          className="absolute end-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 w-44 text-sm dark:bg-slate-800 dark:border-slate-700"
        >
          {SUPPORTED_LANGS.map(lang => (
            <li key={lang.code} role="option" aria-selected={value === lang.code}>
              <button
                type="button"
                lang={lang.code}
                onClick={() => { onChange(lang.code); setOpen(false) }}
                className={cx(
                  'w-full text-start px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700',
                  value === lang.code ? 'text-slate-900 font-medium dark:text-slate-50' : 'text-slate-600 dark:text-slate-300',
                )}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
