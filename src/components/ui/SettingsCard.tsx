import { CARD } from '../../lib/cn'

interface Props {
  title?: string
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ title, children, className = '' }: Props) {
  return (
    <div className={`${CARD} ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
