import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { CARD } from '../../lib/styles'

interface Props {
  title?: string
  children: ReactNode
  className?: string
}

export function SettingsCard({ title, children, className }: Props) {
  return (
    <section className={cx(CARD, className)} aria-label={title}>
      {title && (
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
