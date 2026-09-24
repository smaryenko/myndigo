import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChildren } from '../lib/db'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import type { ChildRow } from '../lib/types'

type ChildSummary = ChildRow & { name: string; photo_base64: string | null }

export function DashboardPage() {
  const { t } = useTranslation()
  const [children, setChildren] = useState<ChildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getChildren()
      .then(setChildren)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>
        <Link
          to="/children/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + {t('dashboard.addChild')}
        </Link>
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <p className="text-red-600 text-sm text-center py-8" role="alert">{error}</p>
      )}

      {!loading && !error && children.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">👧🧒</div>
          <p className="font-medium text-slate-500">{t('dashboard.noChildren')}</p>
          <p className="text-sm mt-1">{t('dashboard.noChildrenHint')}</p>
        </div>
      )}

      {!loading && children.length > 0 && (
        <ul className="space-y-3">
          {children.map(child => (
            <li key={child.id}>
              <Link
                to={`/children/${child.id}`}
                className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {child.photo_base64 ? (
                    <img src={child.photo_base64} alt={child.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🧒</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{child.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {child.sharing_enabled ? (
                      <span className="text-green-600">● {t('share.sharingOn')}</span>
                    ) : (
                      <span className="text-slate-400">○ {t('share.sharingOff')}</span>
                    )}
                  </p>
                </div>
                <span className="text-slate-300 text-lg">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
