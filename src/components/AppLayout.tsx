import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { LanguageSelector } from './LanguageSelector'

export function AppLayout() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
        <NavLink to="/" className="text-xl font-bold text-indigo-600 tracking-tight flex-shrink-0">
          {t('common.appName')}
        </NavLink>

        <div className="flex items-center gap-3 ml-auto">
          <LanguageSelector />
          {/* Dashboard link — icon on mobile, text on larger screens */}
          <NavLink
            to="/dashboard"
            className="text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
            aria-label={t('dashboard.title')}
          >
            <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hidden sm:block text-sm">{t('dashboard.title')}</span>
          </NavLink>
          {/* Account link — icon on mobile, email text on larger screens */}
          <NavLink
            to="/account"
            className="text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
            aria-label={t('account.title')}
          >
            <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:block text-sm truncate max-w-[160px]">{user?.email}</span>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-500 hover:text-red-600 transition-colors flex-shrink-0"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
