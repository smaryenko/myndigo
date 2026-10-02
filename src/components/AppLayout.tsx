import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/useAuth'
import { cx } from '../lib/cx'
import { ICON_BTN, ICON_BTN_ACTIVE } from '../lib/styles'
import { LanguageSelector } from './LanguageSelector'
import { ThemeToggle } from './ThemeToggle'
import { IconTooltip } from './ui/IconTooltip'

const ICON = 'w-[1.1rem] h-[1.1rem]'

export function AppLayout() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Account tooltip includes the signed-in email (the old text label).
  const accountLabel = user?.email ? `${t('account.title')} · ${user.email}` : t('account.title')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top nav — every control is a round icon button with a tooltip */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3 dark:bg-slate-900 dark:border-slate-800">
        <NavLink to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight flex-shrink-0">
          {t('common.appName')}
        </NavLink>

        <div className="flex items-center gap-2 ml-auto">
          <LanguageSelector />
          <ThemeToggle />
          <IconTooltip label={t('dashboard.title')}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => cx(ICON_BTN, isActive && ICON_BTN_ACTIVE)}
              aria-label={t('dashboard.title')}
            >
              <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </NavLink>
          </IconTooltip>
          <IconTooltip label={accountLabel} align="end">
            <NavLink
              to="/account"
              className={({ isActive }) => cx(ICON_BTN, isActive && ICON_BTN_ACTIVE)}
              aria-label={accountLabel}
            >
              <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </NavLink>
          </IconTooltip>
          <IconTooltip label={t('auth.signOut')} align="end">
            <button
              type="button"
              onClick={handleSignOut}
              className={cx(ICON_BTN, 'hover:text-red-600 dark:hover:text-red-400')}
              aria-label={t('auth.signOut')}
            >
              <svg className={cx(ICON, 'rtl:rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </IconTooltip>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
