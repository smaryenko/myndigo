import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGS } from '../lib/languages'
import { currentLanguage, setLanguage } from '../lib/i18n'
import { cx } from '../lib/cx'
import { ICON_BTN } from '../lib/styles'
import { IconTooltip } from './ui/IconTooltip'

interface Props {
  /** Selected language code. Defaults to the current UI language. */
  value?: string
  /** Called with the chosen code. Defaults to switching (and remembering) the UI language. */
  onChange?: (code: string) => void
  /** Show a spinner ring (e.g. while shared-page content is being translated). */
  translating?: boolean
  /** Tooltip anchor, see IconTooltip. */
  tooltipAlign?: 'center' | 'end'
  /** Open the list upwards (e.g. in a page footer). */
  openUp?: boolean
  className?: string
}

/**
 * The one language picker used on every page (nav bars, landing footer,
 * shared profile): a round icon button showing the short code ("EN") that
 * opens a themed listbox. Custom rather than a native <select> so the open
 * list looks and sizes the same everywhere.
 *
 * Keyboard: Enter/Space/↓ open, ↑/↓/Home/End move, Enter selects, Escape or
 * Tab closes. Outside click closes.
 */
export function LanguageSelector({ value, onChange, translating = false, tooltipAlign, openUp = false, className }: Props) {
  const { t } = useTranslation() // re-render on language change
  const code = value ?? currentLanguage()
  const current = SUPPORTED_LANGS.find(l => l.code === code)
  const handleChange = onChange ?? ((next: string) => void setLanguage(next, { persist: true }))
  const label = t('common.selectLanguage')

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const openList = () => {
    setActive(Math.max(0, SUPPORTED_LANGS.findIndex(l => l.code === code)))
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }
  const choose = (next: string) => {
    if (next !== code) handleChange(next)
    close()
  }

  // Focus the list when it opens; close on outside click.
  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() }
  }
  const onListKey = (e: KeyboardEvent) => {
    const last = SUPPORTED_LANGS.length - 1
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(i => Math.min(last, i + 1)); break
      case 'ArrowUp':   e.preventDefault(); setActive(i => Math.max(0, i - 1)); break
      case 'Home':      e.preventDefault(); setActive(0); break
      case 'End':       e.preventDefault(); setActive(last); break
      case 'Enter':
      case ' ':         e.preventDefault(); choose(SUPPORTED_LANGS[active].code); break
      case 'Escape':    e.preventDefault(); close(); break
      case 'Tab':       close(false); break
    }
  }

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <IconTooltip label={label} align={tooltipAlign} disabled={open}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (open ? close() : openList())}
          onKeyDown={onButtonKey}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`${label}: ${current?.label ?? code}`}
          aria-busy={translating || undefined}
          className={cx(ICON_BTN, 'text-xs font-semibold')}
        >
          <span aria-hidden="true">{current?.short ?? code.toUpperCase()}</span>
          {translating && (
            <span className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" aria-hidden="true" />
          )}
        </button>
      </IconTooltip>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className={cx(
            openUp ? 'bottom-full mb-2' : 'top-full mt-2',
            'absolute end-0 z-50 w-40 overflow-hidden rounded-xl border text-[13px] leading-tight shadow-lg focus:outline-none',
            'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700',
          )}
        >
          {SUPPORTED_LANGS.map((l, i) => {
            const selected = l.code === code
            return (
              <li
                key={l.code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                lang={l.code}
                onClick={() => choose(l.code)}
                onPointerMove={() => setActive(i)}
                className={cx(
                  'flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none',
                  i === active && 'bg-slate-100 dark:bg-slate-700',
                  selected ? 'font-semibold text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200',
                )}
              >
                <span className="w-6 text-[11px] font-semibold text-slate-400 dark:text-slate-500" aria-hidden="true">{l.short}</span>
                <span className="flex-1">{l.label}</span>
                {selected && <span aria-hidden="true">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
