import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from './LanguageSelector'

export function PublicLayout() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 tracking-tight">
            {t('common.appName')}
          </Link>

          {/* Desktop — section links only on landing page */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            {isLanding && (
              <>
                <a href="#features" className="hover:text-slate-900 transition-colors">{t('landing.nav.features')}</a>
                <a href="#how-it-works" className="hover:text-slate-900 transition-colors">{t('landing.nav.howItWorks')}</a>
                <a href="#privacy" className="hover:text-slate-900 transition-colors">{t('landing.nav.privacy')}</a>
                <a href="#faq" className="hover:text-slate-900 transition-colors">{t('landing.nav.faq')}</a>
              </>
            )}
          </div>

          {/* Desktop right — language + login */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
              {t('auth.signIn')}
            </Link>
          </div>

          {/* Mobile: language selector + login + hamburger (landing only) */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector />
            <Link to="/login" className="text-sm text-slate-600 font-medium px-1">
              {t('auth.signIn')}
            </Link>
            {isLanding && (
              <button
                type="button"
                onClick={() => setMenuOpen(m => !m)}
                className="p-2 text-slate-500 hover:text-slate-800"
                aria-label={t('common.toggleMenu')}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu — landing section links only */}
        {menuOpen && isLanding && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 py-2">{t('landing.nav.features')}</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 py-2">{t('landing.nav.howItWorks')}</a>
            <a href="#privacy" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 py-2">{t('landing.nav.privacy')}</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="block text-sm text-slate-700 py-2">{t('landing.nav.faq')}</a>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  )
}
