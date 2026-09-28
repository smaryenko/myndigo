import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChildren } from '../lib/db'
import { userMessage } from '../lib/errors'
import { useAsync } from '../hooks/useAsync'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { InlineError } from '../components/ui/InlineError'

export function DashboardPage() {
  const { t } = useTranslation()
  const { data, loading, error } = useAsync(getChildren, 'children')
  const children = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('dashboard.title')}</h1>
        <Link
          to="/children/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + {t('dashboard.addChild')}
        </Link>
      </div>

      {loading && <LoadingSpinner />}

      {error ? <InlineError message={userMessage(error, t('common.error'))} size="md" className="text-center" /> : null}

      {!loading && !error && children.length === 0 && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <div className="text-5xl mb-4" aria-hidden="true">👧🧒</div>
          <p className="font-medium text-slate-500 dark:text-slate-400">{t('dashboard.noChildren')}</p>
          <p className="text-sm mt-1">{t('dashboard.noChildrenHint')}</p>
        </div>
      )}

      {!loading && children.length > 0 && (
        <ul className="space-y-3">
          {children.map(child => {
            const name = child.name || t('errors.childProfile')
            return (
              <li key={child.id}>
                <Link
                  to={`/children/${child.id}`}
                  className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {child.photo_base64 ? (
                      <img src={child.photo_base64} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl" aria-hidden="true">🧒</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {child.sharing_enabled ? (
                        <span className="text-green-600 dark:text-green-400"><span aria-hidden="true">● </span>{t('share.sharingOn')}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500"><span aria-hidden="true">○ </span>{t('share.sharingOff')}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 text-lg rtl:rotate-180" aria-hidden="true">›</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
