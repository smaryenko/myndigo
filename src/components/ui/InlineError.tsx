import { cx } from '../../lib/cx'

interface Props {
  message: string | null | undefined
  /** 'sm' — compact, inside section cards. 'md' — page-level banner. */
  size?: 'sm' | 'md'
  className?: string
}

/** The one way to show an error message inline. Renders nothing when message is empty. */
export function InlineError({ message, size = 'sm', className }: Props) {
  if (!message) return null
  return (
    <p
      role="alert"
      className={cx(
        'text-red-600 bg-red-50 border border-red-200',
        size === 'sm' ? 'text-xs rounded-lg px-2.5 py-1.5' : 'text-sm rounded-xl px-3 py-2',
        className,
      )}
    >
      {message}
    </p>
  )
}
