// Single source of truth lives next to the Edge Functions so the translate
// function validates against exactly the same list the UI offers.
export { SUPPORTED_LANGS, SUPPORTED_LANG_CODES, isSupportedLang } from '../../supabase/functions/_shared/languages.ts'
export type { LangCode } from '../../supabase/functions/_shared/languages.ts'
