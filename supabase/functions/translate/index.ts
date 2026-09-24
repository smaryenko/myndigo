// Supabase Edge Function: translate
// Public endpoint — no JWT required (--no-verify-jwt flag on deploy).
// Only ever operates on children with sharing_enabled = true (checked below) —
// the service-role key bypasses RLS, so this function is the enforcement point.
//
// 1. Verify the child exists and sharing is enabled (authorization gate)
// 2. Read translatable content from profile_entries (dynamic field-definitions model)
// 3. Check cache (content_translations) for each field
// 4. Translate missing fields via the configured provider (TRANSLATION_PROVIDER env var)
// 5. Store results in cache
// 6. Return flat map { fieldPath: translatedText }

import { createTranslationProvider } from './providers/index.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, x-client-info',
}

// Only forward requests for languages the app actually supports — prevents
// arbitrary strings from being forwarded to a paid third-party API and
// polluting the cache with junk target_lang rows.
const SUPPORTED_LANGS = new Set(['en', 'uk', 'es', 'fr', 'de', 'pt', 'it', 'ar', 'zh', 'ja', 'pl'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ProfileEntryRow {
  id: string
  section_key: string
  hidden_fields: string[]
  values: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { child_id, target_lang } = await req.json()

    if (!child_id || !target_lang || !UUID_RE.test(child_id) || !SUPPORTED_LANGS.has(target_lang)) {
      return new Response(JSON.stringify({ error: 'valid child_id and supported target_lang required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dbHeaders = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }

    // ── 0. Authorization gate ───────────────────────────────────────────
    // The service-role key below bypasses RLS entirely, so this check is
    // the only thing standing between an arbitrary child_id and its data.
    // Only proceed for children the parent has actually chosen to share.
    const childRes = await fetch(
      `${supabaseUrl}/rest/v1/children?id=eq.${child_id}&select=id,sharing_enabled,profile_type`,
      { headers: dbHeaders },
    )
    const childRows = await childRes.json()
    const child = Array.isArray(childRows) ? childRows[0] : null
    if (!child || child.sharing_enabled !== true) {
      // Same response shape whether the child doesn't exist or isn't shared —
      // don't reveal which, to avoid confirming valid-but-unshared child IDs.
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 1. Fetch translatable field keys for this child's profile_type ──
    // Two plain requests instead of a PostgREST embedded-resource filter —
    // simpler to reason about and doesn't depend on embed/FK-naming quirks.
    const sectionsRes = await fetch(
      `${supabaseUrl}/rest/v1/section_definitions?profile_type=eq.${child.profile_type}&select=id,section_key`,
      { headers: dbHeaders },
    )
    const sections: { id: string; section_key: string }[] = await sectionsRes.json()
    const sectionKeyById = new Map((Array.isArray(sections) ? sections : []).map(s => [s.id, s.section_key]))
    const sectionIds = [...sectionKeyById.keys()]

    const translatableKeysBySection = new Map<string, Set<string>>()
    if (sectionIds.length) {
      const idsFilter = sectionIds.join(',')
      const fieldDefsRes = await fetch(
        `${supabaseUrl}/rest/v1/field_definitions?section_id=in.(${idsFilter})&translatable=eq.true&select=field_key,section_id`,
        { headers: dbHeaders },
      )
      const fieldDefsRaw: { field_key: string; section_id: string }[] = await fieldDefsRes.json()
      if (Array.isArray(fieldDefsRaw)) {
        for (const row of fieldDefsRaw) {
          const sectionKey = sectionKeyById.get(row.section_id)
          if (!sectionKey) continue
          if (!translatableKeysBySection.has(sectionKey)) translatableKeysBySection.set(sectionKey, new Set())
          translatableKeysBySection.get(sectionKey)!.add(row.field_key)
        }
      }
    }

    // ── 2. Fetch the child's profile entries ─────────────────────────────
    const entriesRes = await fetch(
      `${supabaseUrl}/rest/v1/profile_entries?child_id=eq.${child_id}&select=id,section_key,hidden_fields,values`,
      { headers: dbHeaders },
    )
    const entries: ProfileEntryRow[] = await entriesRes.json()

    // ── 3. Build flat map of { fieldPath: originalText } ────────────────
    // fieldPath format: "{section_key}.{entry.id}.{field_key}" — matches
    // exactly what SharedProfilePage's tx() helper looks up (e.g.
    // `contacts.${contact.id}.name`, `triggers.${trigger.id}.trigger_text`).
    // Single-entry sections (communication, behavioral_notes, education)
    // use the frontend's shorter convention instead: "{section_key}.{field_key}"
    // (e.g. "behavioral_notes.content", "communication.aac_device"), and
    // list-typed fields append the index ("communication.instructions.0").
    const SINGLE_ENTRY_SECTIONS = new Set(['communication', 'behavioral_notes', 'education'])
    const toTranslate: Record<string, string> = {}
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const translatableKeys = translatableKeysBySection.get(entry.section_key)
        if (!translatableKeys) continue
        const hidden = new Set(entry.hidden_fields ?? [])
        const prefix = SINGLE_ENTRY_SECTIONS.has(entry.section_key)
          ? entry.section_key
          : `${entry.section_key}.${entry.id}`
        for (const fieldKey of translatableKeys) {
          if (hidden.has(fieldKey)) continue // don't waste API calls translating hidden fields
          const raw = entry.values?.[fieldKey]
          if (typeof raw === 'string' && raw.trim()) {
            toTranslate[`${prefix}.${fieldKey}`] = raw
          } else if (Array.isArray(raw)) {
            raw.forEach((item, i) => {
              if (typeof item === 'string' && item.trim()) {
                toTranslate[`${prefix}.${fieldKey}.${i}`] = item
              }
            })
          }
        }
      }
    }

    const fieldPaths = Object.keys(toTranslate)
    if (!fieldPaths.length) {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. Check cache ────────────────────────────────────────────────────
    const cacheRes = await fetch(
      `${supabaseUrl}/rest/v1/content_translations?child_id=eq.${child_id}&target_lang=eq.${target_lang}&select=field_path,translated_text`,
      { headers: dbHeaders },
    )
    const allCached: { field_path: string; translated_text: string }[] = await cacheRes.json()
    const fieldPathSet = new Set(fieldPaths)
    const cached = Array.isArray(allCached) ? allCached.filter(r => fieldPathSet.has(r.field_path)) : []
    const cachedMap: Record<string, string> = {}
    for (const row of cached) cachedMap[row.field_path] = row.translated_text

    const missing = fieldPaths.filter(fp => !cachedMap[fp])

    // ── 5. Translate missing fields via the adapter provider ────────────
    const newTranslations: Record<string, string> = {}

    if (missing.length > 0) {
      const provider = createTranslationProvider()
      const texts = missing.map(fp => toTranslate[fp])
      const translated = await provider.translateBatch(texts, target_lang)

      missing.forEach((fp, i) => { newTranslations[fp] = translated[i] ?? toTranslate[fp] })

      // ── 6. Store in cache ───────────────────────────────────────────────
      const providerName = Deno.env.get('TRANSLATION_PROVIDER') ?? 'deepl'
      const rows = missing.map(fp => ({
        child_id,
        field_path: fp,
        source_lang: 'auto',
        target_lang,
        translated_text: newTranslations[fp],
        provider_used: providerName,
      }))
      await fetch(`${supabaseUrl}/rest/v1/content_translations`, {
        method: 'POST',
        headers: { ...dbHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(rows),
      })
    }

    return new Response(JSON.stringify({ translations: { ...cachedMap, ...newTranslations } }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('translate: error:', err)
    return new Response(JSON.stringify({ error: 'translation failed' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
