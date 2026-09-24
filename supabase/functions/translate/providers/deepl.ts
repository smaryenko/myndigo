import type { TranslationProvider, Language } from './types.ts'

// DeepL language code mapping — DeepL uses slightly different codes
const TO_DEEPL: Record<string, string> = {
  en: 'EN-GB',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  pt: 'PT-PT',
  it: 'IT',
  ar: 'AR',
  zh: 'ZH',
  ja: 'JA',
  pl: 'PL',
}

export class DeepLProvider implements TranslationProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    // Free tier uses api-free.deepl.com, paid uses api.deepl.com
    this.baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2'
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const results = await this.translateBatch([text], targetLang, sourceLang)
    return results[0]
  }

  async translateBatch(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
    const deeplTarget = TO_DEEPL[targetLang] ?? targetLang.toUpperCase()
    const deeplSource = sourceLang ? (TO_DEEPL[sourceLang] ?? sourceLang.toUpperCase()) : undefined

    const body = new URLSearchParams()
    texts.forEach(t => body.append('text', t))
    body.set('target_lang', deeplTarget)
    if (deeplSource) body.set('source_lang', deeplSource)
    // NOTE: do NOT set tag_handling: 'xml' here. All content translated by
    // this app (trigger text, sensory notes, etc.) is plain text, never
    // XML/HTML. Setting tag_handling=xml turns on DeepL's outline_detection
    // heuristic, which treats short, terse, punctuation-free phrases (e.g.
    // "covers ears") as headings/labels and passes them through with little
    // or no translation — while longer, sentence-like text in the SAME
    // batch translates normally. That produced exactly this bug: some
    // field values translated and others (with identical field_type and
    // section) silently didn't, depending only on each string's shape.
    // If a future field genuinely needs tag preservation, that call should
    // opt in explicitly with outline_detection=0 and appropriate
    // splitting_tags/ignore_tags — not the default for all plain text.

    const res = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`DeepL API error ${res.status}: ${err}`)
    }

    const data = await res.json() as { translations: { text: string }[] }
    return data.translations.map(t => t.text)
  }

  async supportedLanguages(): Promise<Language[]> {
    const res = await fetch(`${this.baseUrl}/languages?type=target`, {
      headers: { 'Authorization': `DeepL-Auth-Key ${this.apiKey}` },
    })
    if (!res.ok) throw new Error(`DeepL languages error ${res.status}`)
    const data = await res.json() as { language: string; name: string }[]
    return data.map(l => ({ code: l.language.toLowerCase(), name: l.name }))
  }
}
