import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../locales/en.json'

// English is loaded eagerly — it's the fallback and most common language.
// All other languages are loaded on demand when first requested.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator'],
      caches: [],
    },
  })

// Lazy-load a locale file and add it to i18n on demand
const loadedLangs = new Set(['en'])

export async function loadLanguage(lang: string): Promise<void> {
  if (loadedLangs.has(lang)) return

  const localeMap: Record<string, () => Promise<unknown>> = {
    uk: () => import('../locales/uk.json'),
    es: () => import('../locales/es.json'),
    fr: () => import('../locales/fr.json'),
    de: () => import('../locales/de.json'),
    pt: () => import('../locales/pt.json'),
    it: () => import('../locales/it.json'),
    ar: () => import('../locales/ar.json'),
    zh: () => import('../locales/zh.json'),
    ja: () => import('../locales/ja.json'),
    pl: () => import('../locales/pl.json'),
  }

  const loader = localeMap[lang]
  if (!loader) return

  const module = await loader() as { default: Record<string, unknown> }
  i18n.addResourceBundle(lang, 'translation', module.default, true, true)
  loadedLangs.add(lang)
}

export default i18n
