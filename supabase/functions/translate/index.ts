// Supabase Edge Function: translate
// Public endpoint — no JWT required (--no-verify-jwt flag on deploy).
// Uses the service-role key (bypasses RLS), so this function is the
// authorization boundary: it only ever touches children with
// sharing_enabled = true, and only entries whose section is visible.
//
// 1. Verify the child exists and sharing is enabled (authorization gate)
// 2. Read translatable, visible content from profile_entries
// 3. Check the cache (content_translations) for each field path
// 4. Translate missing fields via the configured provider (TRANSLATION_PROVIDER)
// 5. Store results in the cache
// 6. Return a flat map { fieldPath: translatedText }
//
// Field paths come from _shared/fieldPath.ts — the same module the shared
// page uses to look them up.

import { createTranslationProvider } from './providers/index.ts'
import { collectTranslatableTexts } from '../_shared/fieldPath.ts'
import { isSupportedLang } from '../_shared/languages.ts'
import { corsHeaders, isUuid, json, preflight } from '../_shared/http.ts'
import { getSharedChild, restInsert, restSelect, serviceEnv } from '../_shared/rest.ts'

const CORS = corsHeaders('*')

interface SectionWithFields {
  section_key: string
  field_definitions: { field_key: string; translatable: boolean }[]
}

interface EntryRow {
  id: string
  section_key: string
  hidden_fields: string[]
  values: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(CORS)

  try {
    const { child_id, target_lang } = await req.json()

    // Only forward languages the app supports — prevents arbitrary strings
    // reaching a paid third-party API and polluting the cache.
    if (!isUuid(child_id) || !isSupportedLang(target_lang)) {
      return json({ error: 'valid child_id and supported target_lang required' }, CORS, 400)
    }

    const env = serviceEnv()

    // ── 1. Authorization gate ───────────────────────────────────────────
    // Same response whether the child doesn't exist or isn't shared.
    const child = await getSharedChild(env, child_id)
    if (!child) return json({ translations: {} }, CORS)

    // ── 2. Translatable field keys + visible entries ────────────────────
    const [sections, entries] = await Promise.all([
      restSelect<SectionWithFields>(
        env,
        `section_definitions?profile_type=eq.${encodeURIComponent(child.profile_type)}` +
          `&select=section_key,field_definitions(field_key,translatable)`,
      ),
      restSelect<EntryRow>(
        env,
        // section_visible=eq.true: hidden sections must never be translated
        // and returned to an anonymous viewer.
        `profile_entries?child_id=eq.${child.id}&section_visible=eq.true` +
          `&select=id,section_key,hidden_fields,values`,
      ),
    ])

    const translatableKeysBySection = new Map<string, Set<string>>()
    for (const s of sections) {
      const keys = new Set(s.field_definitions.filter(f => f.translatable).map(f => f.field_key))
      if (keys.size) translatableKeysBySection.set(s.section_key, keys)
    }

    const toTranslate = collectTranslatableTexts(entries, translatableKeysBySection)
    const fieldPaths = Object.keys(toTranslate)
    if (!fieldPaths.length) return json({ translations: {} }, CORS)

    // ── 3. Cache lookup ─────────────────────────────────────────────────
    const cachedRows = await restSelect<{ field_path: string; translated_text: string }>(
      env,
      `content_translations?child_id=eq.${child.id}&target_lang=eq.${target_lang}` +
        `&select=field_path,translated_text`,
    )
    const wanted = new Set(fieldPaths)
    const cached: Record<string, string> = {}
    for (const row of cachedRows) {
      if (wanted.has(row.field_path)) cached[row.field_path] = row.translated_text
    }

    const missing = fieldPaths.filter(fp => !(fp in cached))

    // ── 4. Translate missing fields ─────────────────────────────────────
    const fresh: Record<string, string> = {}
    if (missing.length) {
      const provider = createTranslationProvider()
      const translated = await provider.translateBatch(missing.map(fp => toTranslate[fp]), target_lang)
      missing.forEach((fp, i) => { fresh[fp] = translated[i] ?? toTranslate[fp] })

      // ── 5. Store in cache ─────────────────────────────────────────────
      // on_conflict targets the (child_id, field_path, target_lang) unique
      // key — without it PostgREST upserts on the primary key only, and a
      // concurrent request for the same language would fail with 409.
      const providerName = (Deno.env.get('TRANSLATION_PROVIDER') ?? 'deepl').toLowerCase()
      try {
        await restInsert(
          env,
          'content_translations?on_conflict=child_id,field_path,target_lang',
          missing.map(fp => ({
            child_id: child.id,
            field_path: fp,
            source_lang: 'auto',
            target_lang,
            translated_text: fresh[fp],
            provider_used: providerName,
          })),
          'resolution=merge-duplicates,return=minimal',
        )
      } catch (err) {
        // A cache write failure shouldn't fail the viewer's request.
        console.error('translate: cache write failed:', err)
      }
    }

    return json({ translations: { ...cached, ...fresh } }, CORS)
  } catch (err) {
    console.error('translate: error:', err)
    return json({ error: 'translation failed' }, CORS, 500)
  }
})
