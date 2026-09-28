// ============================================================
// Supported languages — single source of truth.
//
// Imported by the translate Edge Function (to reject unsupported
// target languages before they reach a paid API) and by the frontend
// (src/lib/languages.ts re-exports it for pickers and i18n loading).
// Adding a language: add it here AND add src/locales/<code>.json.
//
// No imports — this file must stay runnable in both Deno and the browser.
// ============================================================

export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'uk', label: 'Українська', short: 'UA' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'it', label: 'Italiano', short: 'IT' },
  { code: 'ar', label: 'العربية', short: 'AR' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'pl', label: 'Polski', short: 'PL' },
] as const

export type LangCode = typeof SUPPORTED_LANGS[number]['code']

export const SUPPORTED_LANG_CODES: readonly string[] = SUPPORTED_LANGS.map(l => l.code)

export function isSupportedLang(code: unknown): code is LangCode {
  return typeof code === 'string' && SUPPORTED_LANG_CODES.includes(code)
}
