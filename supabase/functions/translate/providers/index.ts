import type { TranslationProvider } from './types.ts'
import { DeepLProvider } from './deepl.ts'
import { GoogleTranslateProvider } from './google.ts'
import { LibreTranslateProvider } from './libre.ts'

export type { TranslationProvider, Language } from './types.ts'

/**
 * Factory — reads TRANSLATION_PROVIDER env var and returns the correct provider.
 * Swap providers by changing one env var: deepl | google | libre
 */
export function createTranslationProvider(): TranslationProvider {
  const provider = (Deno.env.get('TRANSLATION_PROVIDER') ?? 'deepl').toLowerCase()

  switch (provider) {
    case 'deepl': {
      const key = Deno.env.get('DEEPL_API_KEY')
      if (!key) throw new Error('DEEPL_API_KEY env var is required for DeepL provider')
      return new DeepLProvider(key)
    }
    case 'google': {
      const key = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')
      if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY env var is required for Google provider')
      return new GoogleTranslateProvider(key)
    }
    case 'libre': {
      const url = Deno.env.get('LIBRE_TRANSLATE_URL') ?? 'http://localhost:5000'
      return new LibreTranslateProvider(url)
    }
    default:
      throw new Error(`Unknown TRANSLATION_PROVIDER: "${provider}". Must be deepl | google | libre`)
  }
}
