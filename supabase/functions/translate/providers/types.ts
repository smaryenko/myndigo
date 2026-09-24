// ============================================================
// Translation provider interface
// Swap providers by changing TRANSLATION_PROVIDER env var:
//   deepl | google | libre
// ============================================================

export interface Language {
  code: string
  name: string
}

export interface TranslationProvider {
  /** Translate a single string */
  translate(text: string, targetLang: string, sourceLang?: string): Promise<string>

  /** Translate multiple strings in one API call where possible */
  translateBatch(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]>

  /** List supported languages */
  supportedLanguages(): Promise<Language[]>
}
