// ============================================================
// Data layer — every Supabase query, RPC and Edge Function call.
// Components never talk to `supabase` directly.
//
// Convention (see errors.ts): every function throws on failure.
// Authorization is enforced by RLS / security-definer functions in
// schema.sql; filters here only scope queries.
// ============================================================

import { supabase } from './supabase'
import type {
  ChildRow,
  ChildProfile,
  ChildSummary,
  EntryValues,
  FieldDefinition,
  PersonalInfoRow,
  ProfileEntryRow,
  SectionDefinition,
  ShareAuditLogRow,
  ShareManagementData,
  SharedProfile,
} from './types'

// ============================================================
// CHILDREN
// ============================================================

/** All children for the current user, with name + photo for the dashboard. */
export async function getChildren(): Promise<ChildSummary[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('children')
    .select('*, personal_info(name, photo_base64)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map(({ personal_info, ...child }) => {
    const info = firstOrNull(personal_info as Pick<PersonalInfoRow, 'name' | 'photo_base64'> | Pick<PersonalInfoRow, 'name' | 'photo_base64'>[] | null)
    return {
      ...(child as ChildRow),
      name: info?.name ?? '',
      photo_base64: info?.photo_base64 ?? null,
    }
  })
}

/**
 * Create a child and its personal_info row in one transaction
 * (create_child RPC) — no orphan child if the second insert fails.
 */
export async function createChild(info: { name: string; dateOfBirth: string | null; pronouns: string | null }): Promise<ChildRow> {
  const { data, error } = await supabase.rpc('create_child', {
    p_name: info.name,
    p_date_of_birth: info.dateOfBirth,
    p_pronouns: info.pronouns,
  })
  if (error) throw error
  return data as ChildRow
}

/** Delete a child and all related data (FK cascade handles sub-records). */
export async function deleteChild(childId: string): Promise<void> {
  const { error } = await supabase.from('children').delete().eq('id', childId)
  if (error) throw error
}

async function updateChild(childId: string, patch: Partial<Pick<ChildRow, 'sharing_enabled' | 'share_language' | 'share_theme'>>): Promise<void> {
  const { error } = await supabase.from('children').update(patch).eq('id', childId)
  if (error) throw error
}

export const setChildSharing = (childId: string, enabled: boolean) => updateChild(childId, { sharing_enabled: enabled })
export const setChildShareLanguage = (childId: string, lang: string) => updateChild(childId, { share_language: lang })
export const setChildShareTheme = (childId: string, theme: string) => updateChild(childId, { share_theme: theme })

/** Regenerate the share token — old QR codes / NFC chips stop working. */
export async function regenerateShareToken(childId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_share_token', { p_child_id: childId })
  if (error) throw error
  return data as string
}

/**
 * Remember whether a repeatable section is hidden while it has zero
 * entries (children.hidden_empty_sections). Atomic server-side
 * array_append/array_remove — returns the updated array.
 */
export async function setEmptySectionHidden(childId: string, sectionKey: string, hidden: boolean): Promise<string[]> {
  const { data, error } = await supabase.rpc('set_empty_section_hidden', {
    p_child_id: childId,
    p_section_key: sectionKey,
    p_hidden: hidden,
  })
  if (error) throw error
  if (!Array.isArray(data)) throw new Error('set_empty_section_hidden: child not found')
  return data as string[]
}

// ============================================================
// FULL PROFILE (owner edit page) — two round trips:
// the child with its personal info + entries, then the definitions
// for its profile_type with their fields embedded.
// ============================================================

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const { data, error } = await supabase
    .from('children')
    .select('*, personal_info(*), profile_entries(*)')
    .eq('id', childId)
    .order('sort_order', { referencedTable: 'profile_entries' })
    .single()
  if (error) throw error

  const { personal_info, profile_entries, ...child } = data as ChildRow & {
    personal_info: PersonalInfoRow | PersonalInfoRow[] | null
    profile_entries: ProfileEntryRow[] | null
  }

  const { data: sectionRows, error: sectionError } = await supabase
    .from('section_definitions')
    .select('*, field_definitions(*)')
    .eq('profile_type', child.profile_type)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'field_definitions' })
  if (sectionError) throw sectionError

  const sections: SectionDefinition[] = []
  const fieldsBySection: Record<string, FieldDefinition[]> = {}
  for (const row of (sectionRows ?? []) as (SectionDefinition & { field_definitions: FieldDefinition[] | null })[]) {
    const { field_definitions, ...section } = row
    sections.push(section)
    fieldsBySection[section.section_key] = field_definitions ?? []
  }

  return {
    child,
    personalInfo: firstOrNull(personal_info),
    entries: profile_entries ?? [],
    sections,
    fieldsBySection,
  }
}

// ============================================================
// SHARED PROFILE (public read-only page, anon access)
// get_shared_profile() is the only read path for anonymous viewers — see
// the "Anonymous access" notes in schema.sql.
// ============================================================

export async function getSharedProfile(token: string): Promise<SharedProfile | null> {
  const { data, error } = await supabase.rpc('get_shared_profile', { p_token: token })
  if (error) throw error
  const profile = data as SharedProfile | null
  if (!profile) return null
  // Defensive defaults so an older database function (before sections were
  // added to the payload) degrades to a sparse page instead of crashing.
  return { ...profile, sections: profile.sections ?? [], entries: profile.entries ?? [] }
}

// ============================================================
// PERSONAL INFO
// ============================================================

export async function upsertPersonalInfo(
  childId: string,
  data: Partial<Omit<PersonalInfoRow, 'id' | 'child_id' | 'updated_at'>>,
): Promise<PersonalInfoRow> {
  const { data: row, error } = await supabase
    .from('personal_info')
    .upsert({ child_id: childId, ...data }, { onConflict: 'child_id' })
    .select()
    .single()
  if (error) throw error
  return row as PersonalInfoRow
}

// ============================================================
// PROFILE ENTRIES
// ============================================================

/** Next sort_order for a new entry (max + 1, so deletions never cause duplicates). */
export function nextSortOrder(entries: Pick<ProfileEntryRow, 'sort_order'>[]): number {
  return entries.reduce((max, e) => Math.max(max, e.sort_order), -1) + 1
}

/** Insert (no id) or update (with id) one entry. */
export async function upsertProfileEntry(
  childId: string,
  sectionKey: string,
  entry: Partial<Pick<ProfileEntryRow, 'id' | 'sort_order' | 'section_visible' | 'hidden_fields'>> & { values: EntryValues },
): Promise<ProfileEntryRow> {
  const { data, error } = await supabase
    .from('profile_entries')
    .upsert({ child_id: childId, section_key: sectionKey, ...entry }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data as ProfileEntryRow
}

export async function deleteProfileEntry(id: string): Promise<void> {
  const { error } = await supabase.from('profile_entries').delete().eq('id', id)
  if (error) throw error
}

/** Set section_visible on every entry in a section (bulk visibility toggle). */
export async function setSectionVisibility(entryIds: string[], visible: boolean): Promise<void> {
  if (entryIds.length === 0) return
  const { error } = await supabase
    .from('profile_entries')
    .update({ section_visible: visible })
    .in('id', entryIds)
  if (error) throw error
}

/**
 * Persist a new order for a section's entries (sort_order = index).
 * One bulk upsert request, so the order is saved atomically.
 */
export async function reorderProfileEntries(childId: string, sectionKey: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return
  const { error } = await supabase
    .from('profile_entries')
    .upsert(
      orderedIds.map((id, index) => ({ id, child_id: childId, section_key: sectionKey, sort_order: index })),
      { onConflict: 'id' },
    )
  if (error) throw error
}

// ============================================================
// SHARE MANAGEMENT PAGE
// ============================================================

/** Everything ShareManagementPage needs on mount, fetched in parallel. */
export async function getShareManagementData(childId: string, auditPageSize: number): Promise<ShareManagementData> {
  const [
    { data: child, error: e1 },
    { data: info, error: e2 },
    { data: log, count, error: e3 },
  ] = await Promise.all([
    supabase.from('children').select('*').eq('id', childId).single(),
    supabase.from('personal_info').select('name').eq('child_id', childId).maybeSingle(),
    supabase
      .from('share_audit_log')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('viewed_at', { ascending: false })
      .limit(auditPageSize),
  ])

  const firstError = e1 ?? e2 ?? e3
  if (firstError) throw firstError

  return {
    child: child as ChildRow,
    childName: info?.name || null,
    auditLog: (log ?? []) as ShareAuditLogRow[],
    auditTotal: count ?? 0,
  }
}

export async function clearAuditLog(childId: string): Promise<void> {
  const { error } = await supabase.from('share_audit_log').delete().eq('child_id', childId)
  if (error) throw error
}

/**
 * Audit log entries older than `before` (keyset pagination). Using the
 * last loaded row's timestamp instead of an offset means views logged
 * while the page is open don't shift the window and cause duplicates.
 */
export async function getAuditLogBefore(childId: string, before: string, pageSize: number): Promise<ShareAuditLogRow[]> {
  const { data, error } = await supabase
    .from('share_audit_log')
    .select('*')
    .eq('child_id', childId)
    .lt('viewed_at', before)
    .order('viewed_at', { ascending: false })
    .limit(pageSize)
  if (error) throw error
  return (data ?? []) as ShareAuditLogRow[]
}

// ============================================================
// EDGE FUNCTIONS
// ============================================================

/**
 * Parent-entered content translated into `lang`, keyed by fieldPath().
 * Returns {} on failure — the page falls back to the original text.
 */
export async function getFieldTranslations(childId: string, lang: string): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke<{ translations?: Record<string, string> }>('translate', {
    body: { child_id: childId, target_lang: lang },
  })
  if (error) {
    console.error('[translate] failed:', error)
    return {}
  }
  return data?.translations ?? {}
}

/** Record one view of the shared page (fire-and-forget; never throws). */
export async function logShareView(childId: string, coords?: { latitude: number; longitude: number }): Promise<void> {
  const { error } = await supabase.functions.invoke('log-share-view', {
    body: { child_id: childId, user_agent: navigator.userAgent, ...coords },
  })
  if (error) console.error('[log-share-view] failed:', error)
}

/** Permanently delete the signed-in user's account and all their data. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) throw error
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** PostgREST returns one-to-one embeds as an object, but older versions as an array. */
function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
