import { useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface Props {
  /** Visible tooltip text. The wrapped control must carry its own aria-label. */
  label: string
  /** Horizontal anchor: 'center' under the control, 'end' for the last items in a row. */
  align?: 'center' | 'end'
  /** Force-hide (e.g. while the control's menu is open). */
  disabled?: boolean
  /** Extra classes for the wrapper (e.g. responsive visibility). */
  className?: string
  children: ReactNode
}

/**
 * Small tooltip under an icon-only control, shown on mouse hover only —
 * devices without a fine hover pointer (phones, tablets) never render it.
 * Pressing the control hides it until the pointer leaves. Purely visual
 * (aria-hidden) — the control carries the aria-label.
 */
export function IconTooltip({ label, align = 'center', disabled = false, className, children }: Props) {
  const [suppressed, setSuppressed] = useState(false)

  return (
    <span
      className={cx('relative inline-flex group/tip', className)}
      onPointerDown={() => setSuppressed(true)}
      onPointerLeave={() => setSuppressed(false)}
    >
      {children}
      <span
        aria-hidden="true"
        className={cx(
          // Not displayed at all unless the device has a real hover pointer.
          'hidden [@media(hover:hover)_and_(pointer:fine)]:block',
          'pointer-events-none absolute top-full mt-2 z-50 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium shadow-md',
          'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
          'opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
          !suppressed && !disabled && 'group-hover/tip:opacity-100',
          align === 'end' ? 'end-0' : 'left-1/2 -translate-x-1/2',
        )}
      >
        {label}
      </span>
    </span>
  )
}
