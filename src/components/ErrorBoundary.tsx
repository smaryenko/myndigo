import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../lib/i18n'
import { BTN_PRIMARY } from '../lib/styles'

interface State {
  error: Error | null
}

// Messages browsers use when a lazy route chunk can't be fetched — typically
// because a new deploy replaced the hashed file names while this tab was open.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i

/**
 * Catches render errors (including failed lazy-chunk loads) so users get a
 * reload prompt instead of a blank screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const isChunkError = CHUNK_ERROR_RE.test(error.message)
    const t = i18n.t.bind(i18n)

    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-slate-50 dark:bg-slate-950">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {isChunkError ? t('errors.newVersionTitle') : t('errors.unexpectedTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {isChunkError ? t('errors.newVersionHint') : t('errors.unexpectedHint')}
        </p>
        <button type="button" onClick={() => window.location.reload()} className={`${BTN_PRIMARY} px-6`}>
          {t('common.reload')}
        </button>
      </div>
    )
  }
}
