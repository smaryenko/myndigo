import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../components/LanguageSelector'

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const features = t('landing.features.items', { returnObjects: true }) as { icon: string; title: string; description: string }[]
  const steps = t('landing.howItWorks.steps', { returnObjects: true }) as { number: string; title: string; description: string }[]
  const privacyItems = t('landing.privacy.items', { returnObjects: true }) as { icon: string; title: string; description: string }[]
  const faqItems = t('landing.faq.items', { returnObjects: true }) as { q: string; a: string }[]

  return (
    <div className="text-slate-800" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          {t('landing.hero.badge')}
        </span>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight mb-6 max-w-3xl mx-auto">
          {t('landing.hero.headline')}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('landing.hero.subheadline')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-200"
          >
            {t('landing.hero.cta')}
          </Link>
          <a
            href="#how-it-works"
            className="text-slate-600 hover:text-slate-900 font-medium px-6 py-4 transition-colors"
          >
            {t('landing.hero.secondaryCta')} →
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-4">{t('landing.hero.ctaSub')}</p>
      </section>

      {/* ── MOCK SHARED PROFILE PREVIEW ─────────────────────────────────── */}
      <section className="bg-slate-50 py-20" id="demo">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              {t('landing.shareDemo.title')}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">{t('landing.shareDemo.subtitle')}</p>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Alert bar */}
              <div className="bg-red-50 px-4 pt-4 pb-3">
                <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2">⚠️ {t('landing.mockProfile.alertsTitle')}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-red-100 border border-red-300 text-red-800 text-xs font-bold px-2.5 py-1.5 rounded-xl">🍽️ {t('sharedPage.alertTypes.food_allergy')}</span>
                  <span className="bg-orange-100 border border-orange-300 text-orange-800 text-xs font-bold px-2.5 py-1.5 rounded-xl">⚡ {t('sharedPage.alertTypes.epilepsy')}</span>
                  <span className="bg-red-100 border border-red-300 text-red-800 text-xs font-bold px-2.5 py-1.5 rounded-xl">🚪 {t('sharedPage.alertTypes.elopement_risk')}</span>
                </div>
              </div>
              {/* Identity */}
              <div className="px-4 py-3 flex items-center gap-3 border-t border-slate-100">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">🧒</div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Emma, 8</p>
                  <span className="mt-1 inline-block bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{t('landing.mockProfile.nonVerbal')}</span>
                </div>
              </div>
              {/* Triggers + communication */}
              <div className="px-4 py-3 grid grid-cols-2 gap-3 border-t border-slate-100">
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">{t('landing.mockProfile.triggersTitle')}</p>
                  <ul className="space-y-1 text-xs text-red-900">
                    <li>• {t('landing.mockProfile.trigger1')}</li>
                    <li>• {t('landing.mockProfile.trigger2')}</li>
                    <li>• {t('landing.mockProfile.trigger3')}</li>
                  </ul>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">{t('landing.mockProfile.talkTitle')}</p>
                  <ul className="space-y-1 text-xs text-blue-900">
                    <li>• {t('landing.mockProfile.talk1')}</li>
                    <li>• {t('landing.mockProfile.talk2')}</li>
                    <li>• {t('landing.mockProfile.talk3')}</li>
                  </ul>
                </div>
              </div>
              {/* Emergency contacts */}
              <div className="px-4 py-3 space-y-2 border-t border-slate-100">
                <a href="#" className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                  <span className="text-xl">📞</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Mum</p>
                    <p className="text-xs text-slate-500">{t('landing.mockProfile.contactRelation')}</p>
                  </div>
                  <span className="text-green-700 font-semibold text-sm">+44 7700 900000</span>
                </a>
              </div>
              {/* Expandable hint */}
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">{t('landing.mockProfile.expandHint')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            {t('landing.features.title')}
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">{t('landing.features.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-5 hover:bg-indigo-50 transition-colors">
              <span className="text-3xl mb-3 block">{feature.icon}</span>
              <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-slate-500">{t('landing.howItWorks.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-200">
                  {step.number}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute mt-6 ml-32 w-full h-0.5 bg-indigo-100" />
                )}
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY ─────────────────────────────────────────────────────── */}
      <section id="privacy" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            {t('landing.privacy.title')}
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">{t('landing.privacy.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {privacyItems.map((item, i) => (
            <div key={i} className="flex gap-4 bg-slate-50 rounded-2xl p-5">
              <span className="text-3xl flex-shrink-0">{item.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-4xl block mb-4">🔔</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('landing.notifications.title')}
          </h2>
          <p className="text-indigo-200 text-lg max-w-2xl mx-auto leading-relaxed">
            {t('landing.notifications.description')}
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t('landing.faq.title')}
          </h2>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className="border border-slate-100 rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800">{item.q}</span>
                <span className="text-slate-400 ml-4 flex-shrink-0">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-900/50"
          >
            {t('landing.cta.button')}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-indigo-600">{t('common.appName')}</span>
            <p className="text-xs text-slate-400 mt-1">{t('landing.footer.tagline')}</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-800 transition-colors">{t('landing.footer.privacy')}</a>
            <a href="#" className="hover:text-slate-800 transition-colors">{t('landing.footer.terms')}</a>
            <a href="#" className="hover:text-slate-800 transition-colors">{t('landing.footer.contact')}</a>
          </div>
          <LanguageSelector />
        </div>
      </footer>
    </div>
  )
}
