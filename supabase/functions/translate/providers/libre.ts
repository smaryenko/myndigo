import type { TranslationProvider, Language } from './types.ts'

export class LibreTranslateProvider implements TranslationProvider {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async translate(text: string, targetLang: string, sourceLang = 'auto'): Promise<string> {
    const results = await this.translateBatch([text], targetLang, sourceLang)
    return results[0]
  }

  async translateBatch(texts: string[], targetLang: string, sourceLang = 'auto'): Promise<string[]> {
    // LibreTranslate doesn't have a native batch endpoint — run in parallel
    return Promise.all(
      texts.map(async text => {
        const res = await fetch(`${this.baseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
        })
        if (!res.ok) throw new Error(`LibreTranslate error ${res.status}`)
        const data = await res.json() as { translatedText: string }
        return data.translatedText
      })
    )
  }

  async supportedLanguages(): Promise<Language[]> {
    const res = await fetch(`${this.baseUrl}/languages`)
    if (!res.ok) throw new Error(`LibreTranslate languages error ${res.status}`)
    const data = await res.json() as { code: string; name: string }[]
    return data.map(l => ({ code: l.code, name: l.name }))
  }
}
