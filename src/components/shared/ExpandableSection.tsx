import { useId, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { ThemeConfig } from './sharedThemes'

interface Props {
  title: string
  theme: ThemeConfig
  children: ReactNode
}

/** Collapsed-by-default card for below-the-fold shared-page content. */
export function ExpandableSection({ title, theme, children }: Props) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  return (
    <section className={cx(theme.card, 'mb-1.5 overflow-hidden')} aria-label={title}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-4 py-3 text-start"
      >
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <svg
          className={cx('w-4 h-4 text-slate-500 transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div id={contentId} className={cx('px-4 pb-4 border-t pt-3', theme.divider)}>{children}</div>}
    </section>
  )
}
