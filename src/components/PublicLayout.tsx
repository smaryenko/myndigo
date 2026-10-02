import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import { ICON_BTN } from '../lib/styles'
import { LanguageSelector } from './LanguageSelector'
import { ThemeToggle } from './ThemeToggle'
import { IconTooltip } from './ui/IconTooltip'

const ICON = 'w-[1.1rem] h-[1.1rem]'

export function PublicLayout() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 dark:bg-slate-950/95 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {t('common.appName')}
          </Link>

          {/* Desktop — section links only on landing page */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            {isLanding && (
              <>
                <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">{t('landing.nav.features')}</a>
                <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">{t('landing.nav.howItWorks')}</a>
                <a href="#privacy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">{t('landing.nav.privacy')}</a>
                <a href="#faq" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">{t('landing.nav.faq')}</a>
              </>
            )}
          </div>

          {/* Right — round icon controls with tooltips (same on mobile and desktop) */}
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <IconTooltip label={t('auth.signIn')} align="end">
              <Link to="/login" className={ICON_BTN} aria-label={t('auth.signIn')}>
                <svg className={cx(ICON, 'rtl:rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              </Link>
            </IconTooltip>
            {isLanding && (
              <IconTooltip label={t('common.toggleMenu')} align="end" className="md:hidden">
                <button
                  type="button"
                  onClick={() => setMenuOpen(m => !m)}
                  className={ICON_BTN}
                  aria-label={t('common.toggleMenu')}
                  aria-expanded={menuOpen}
                >
                  <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                  </svg>
                </button>
              </IconTooltip>
            )}
          </div>
        </div>

        {/* Mobile menu — landing section links only */}
        {menuOpen && isLanding && (
          <div className="md:hidden border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 px-4 py-4 space-y-1">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 dark:text-slate-300 py-2">{t('landing.nav.features')}</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 dark:text-slate-300 py-2">{t('landing.nav.howItWorks')}</a>
            <a href="#privacy" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 dark:text-slate-300 py-2">{t('landing.nav.privacy')}</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 dark:text-slate-300 py-2">{t('landing.nav.faq')}</a>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  )
}
