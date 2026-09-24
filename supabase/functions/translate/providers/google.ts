import type { TranslationProvider, Language } from './types.ts'

export class GoogleTranslateProvider implements TranslationProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const results = await this.translateBatch([text], targetLang, sourceLang)
    return results[0]
  }

  async translateBatch(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
    const url = new URL('https://translation.googleapis.com/language/translate/v2')
    url.searchParams.set('key', this.apiKey)

    const body: Record<string, unknown> = {
      q: texts,
      target: targetLang,
      format: 'text',
    }
    if (sourceLang) body.source = sourceLang

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Google Translate API error ${res.status}: ${err}`)
    }

    const data = await res.json() as {
      data: { translations: { translatedText: string }[] }
    }
    return data.data.translations.map(t => t.translatedText)
  }

  async supportedLanguages(): Promise<Language[]> {
    const url = new URL('https://translation.googleapis.com/language/translate/v2/languages')
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('target', 'en')

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Google languages error ${res.status}`)

    const data = await res.json() as {
      data: { languages: { language: string; name: string }[] }
    }
    return data.data.languages.map(l => ({ code: l.language, name: l.name }))
  }
}
