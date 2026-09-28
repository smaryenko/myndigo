// ============================================================
// Translation field paths — single source of truth.
//
// Imported by the translate Edge Function (Deno) AND by the frontend
// (src/lib/fieldPath.ts re-exports it), so the key the server caches a
// translation under is always the key the shared page looks it up by.
// Must also match the prefix used by invalidate_translation_cache() in
// supabase/schema.sql: "{section_key}.{entry_id}.".
//
// No imports — this file must stay runnable in both Deno and the browser.
// ============================================================

/**
 * `{section_key}.{entry_id}.{field_key}` — or with a trailing `.{index}`
 * for items of a list-typed (text_list) field.
 */
export function fieldPath(sectionKey: string, entryId: string, fieldKey: string, index?: number): string {
  const base = `${sectionKey}.${entryId}.${fieldKey}`
  return index === undefined ? base : `${base}.${index}`
}

export interface TranslatableEntry {
  id: string
  section_key: string
  hidden_fields?: string[] | null
  values: Record<string, unknown> | null
}

/**
 * Builds `{ fieldPath: sourceText }` for every non-empty, non-hidden,
 * translatable string value (and every string item of translatable lists).
 *
 * @param translatableKeysBySection section_key → set of translatable field_keys
 */
export function collectTranslatableTexts(
  entries: TranslatableEntry[],
  translatableKeysBySection: Map<string, Set<string>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const entry of entries) {
    const keys = translatableKeysBySection.get(entry.section_key)
    if (!keys) continue
    const hidden = new Set(entry.hidden_fields ?? [])
    for (const fieldKey of keys) {
      if (hidden.has(fieldKey)) continue
      const raw = entry.values?.[fieldKey]
      if (typeof raw === 'string') {
        if (raw.trim()) out[fieldPath(entry.section_key, entry.id, fieldKey)] = raw
      } else if (Array.isArray(raw)) {
        raw.forEach((item, i) => {
          if (typeof item === 'string' && item.trim()) {
            out[fieldPath(entry.section_key, entry.id, fieldKey, i)] = item
          }
        })
      }
    }
  }
  return out
}
