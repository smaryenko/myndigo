import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../locales/en.json'
import { SUPPORTED_LANG_CODES, isSupportedLang } from './languages'

// UI language persisted per device. Written only by explicit choices
// (setLanguage with persist: true) — the shared page switches language for
// the viewer without overwriting a parent's own preference on this device.
const STORAGE_KEY = 'myndigo.lang'

// Every non-English locale is a lazy chunk, discovered from the locales
// folder so adding a language never needs a second list here.
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>(
  ['../locales/*.json', '!../locales/en.json'],
)

function loaderFor(lang: string) {
  return localeLoaders[`../locales/${lang}.json`]
}

// Keep <html lang/dir> in sync so Arabic renders right-to-left everywhere
// (app, landing page and shared page) and screen readers use the right voice.
i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
})

const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    // A detected 'de-DE' isn't listed, so i18next falls back to its
    // language part 'de', which is.
    supportedLngs: [...SUPPORTED_LANG_CODES],
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: [],
    },
  })

async function loadLanguage(lang: string): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return
  const loader = loaderFor(lang)
  if (!loader) return
  const module = await loader()
  i18n.addResourceBundle(lang, 'translation', module.default, true, true)
}

/**
 * Base code of the selected language, e.g. 'de'. Uses i18n.language (the
 * requested language), not resolvedLanguage — before a lazy bundle has
 * loaded, resolvedLanguage still reports the 'en' fallback, which would
 * make startup load English instead of the detected language.
 */
export function currentLanguage(): string {
  const base = (i18n.language || 'en').split('-')[0]
  return isSupportedLang(base) ? base : 'en'
}

/**
 * Load a locale (if needed) and switch to it.
 * @param persist remember this as the device's UI language (explicit user choice)
 */
export async function setLanguage(lang: string, { persist = false } = {}): Promise<void> {
  await loadLanguage(lang)
  await i18n.changeLanguage(lang)
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* storage unavailable — ignore */ }
  }
}

/**
 * Resolves once the detected language's bundle is loaded — main.tsx waits
 * on this before rendering, so a German browser shows German on first
 * paint instead of English (the detected language used to be selected but
 * never loaded).
 */
export const i18nReady: Promise<void> = initPromise
  .then(() => setLanguage(currentLanguage()))
  .catch(err => console.error('i18n: failed to load detected language:', err))

export default i18n
