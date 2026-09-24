import { supabase } from './supabase'
import type {
  ChildRow,
  ChildProfile,
  PersonalInfoRow,
  SectionDefinition,
  FieldDefinition,
  ProfileEntryRow,
  SharedProfile,
  ShareAuditLogRow,
} from './types'

// ============================================================
// CHILDREN
// ============================================================

/** Fetch all children for the current user (summary for dashboard) */
export async function getChildren(): Promise<(ChildRow & { name: string; photo_base64: string | null })[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: children, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!children?.length) return []

  // Fetch names in one query
  const ids = children.map(c => c.id)
  const { data: infos, error: infoError } = await supabase
    .from('personal_info')
    .select('child_id, name, photo_base64')
    .in('child_id', ids)

  if (infoError) throw infoError

  const infoMap = Object.fromEntries((infos ?? []).map(i => [i.child_id, i]))

  return children.map(c => ({
    ...c,
    name: infoMap[c.id]?.name ?? 'Unnamed',
    photo_base64: infoMap[c.id]?.photo_base64 ?? null,
  }))
}

/** Create a new child record and seed empty sub-records */
export async function createChild(): Promise<ChildRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: child, error } = await supabase
    .from('children')
    .insert({ user_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Seed empty personal_info row so we can always upsert rather than insert/update.
  // Single-entry dynamic sections (communication, behavioral_notes, education) are
  // created on first save instead — see upsertProfileEntry's insert-if-missing logic.
  await supabase.from('personal_info').insert({ child_id: child.id, name: '' })

  return child
}

/** Delete a child and all related data (cascade handles sub-records) */
export async function deleteChild(childId: string): Promise<void> {
  const { error } = await supabase.from('children').delete().eq('id', childId)
  if (error) throw error
}

/** Toggle sharing on/off */
export async function setChildSharing(childId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({ sharing_enabled: enabled })
    .eq('id', childId)
  if (error) throw error
}

/** Regenerate share token */
export async function regenerateShareToken(childId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_share_token', { p_child_id: childId })
  if (error) throw error
  return data as string
}

/** Change the default viewer language for the shared card */
export async function setChildShareLanguage(childId: string, lang: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({ share_language: lang })
    .eq('id', childId)
  if (error) throw error
}

/** Change the visual theme used on the shared card */
export async function setChildShareTheme(childId: string, theme: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({ share_theme: theme })
    .eq('id', childId)
  if (error) throw error
}

/**
 * Set whether a repeatable section (triggers, contacts, medications, etc.)
 * should be treated as hidden while it has zero entries — see
 * `children.hidden_empty_sections` in schema.sql. Once the section gets
 * its first entry, that entry's own `section_visible` takes over and this
 * flag no longer has any effect until the section is emptied again.
 */
export async function setEmptySectionHidden(
  childId: string,
  sectionKey: string,
  hidden: boolean
): Promise<string[]> {
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('hidden_empty_sections')
    .eq('id', childId)
    .single()
  if (fetchError) throw fetchError

  const current: string[] = child?.hidden_empty_sections ?? []
  const next = hidden
    ? [...new Set([...current, sectionKey])]
    : current.filter(k => k !== sectionKey)

  const { error } = await supabase
    .from('children')
    .update({ hidden_empty_sections: next })
    .eq('id', childId)
  if (error) throw error

  return next
}

// ============================================================
// SECTION / FIELD DEFINITIONS
// Metadata describing what sections/fields exist for a profile_type.
// Rarely changes — safe to fetch alongside the profile every time.
// ============================================================

export async function getSectionDefinitions(profileType: string): Promise<SectionDefinition[]> {
  const { data, error } = await supabase
    .from('section_definitions')
    .select('*')
    .eq('profile_type', profileType)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as SectionDefinition[]
}

export async function getFieldDefinitions(sectionIds: string[]): Promise<FieldDefinition[]> {
  if (sectionIds.length === 0) return []
  const { data, error } = await supabase
    .from('field_definitions')
    .select('*')
    .in('section_id', sectionIds)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as FieldDefinition[]
}

// ============================================================
// FULL PROFILE (for edit page)
// ============================================================

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const { data: child, error: e1 } = await supabase.from('children').select('*').eq('id', childId).single()
  if (e1) throw e1

  const [
    { data: personalInfo, error: e2 },
    { data: entries, error: e3 },
    sections,
  ] = await Promise.all([
    supabase.from('personal_info').select('*').eq('child_id', childId).maybeSingle(),
    supabase.from('profile_entries').select('*').eq('child_id', childId).order('sort_order'),
    getSectionDefinitions(child.profile_type),
  ])

  if (e2) throw e2
  if (e3) throw e3

  const fields = await getFieldDefinitions(sections.map(s => s.id))
  const fieldsBySection: Record<string, FieldDefinition[]> = {}
  for (const section of sections) {
    fieldsBySection[section.section_key] = fields.filter(f => f.section_id === section.id)
  }

  return {
    child: child as ChildRow,
    personalInfo: personalInfo as PersonalInfoRow | null,
    entries: (entries ?? []) as ProfileEntryRow[],
    sections,
    fieldsBySection,
  }
}

// ============================================================
// SHARED PROFILE (for public read-only page, anon access)
// Uses the get_shared_profile() RPC instead of the owner's
// getChildProfile()/select('*') path — that function:
//   - returns only the columns the shared page needs (no risk of a
//     future column addition leaking to anon viewers by default)
//   - strips hidden_fields out of each entry's `values` server-side,
//     rather than relying on the client to not render them
// ============================================================

export async function getSharedProfile(token: string): Promise<SharedProfile | null> {
  const { data, error } = await supabase.rpc('get_shared_profile', { p_token: token })
  if (error) throw error
  return (data as SharedProfile | null) ?? null
}

// ============================================================
// PERSONAL INFO
// ============================================================

export async function upsertPersonalInfo(
  childId: string,
  data: Partial<Omit<PersonalInfoRow, 'id' | 'child_id' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('personal_info')
    .upsert({ child_id: childId, ...data }, { onConflict: 'child_id' })
  if (error) throw error
}

// ============================================================
// PROFILE ENTRIES
// Generic CRUD replacing the ~8 near-identical per-section
// upsert/delete pairs that existed before this migration.
// ============================================================

/** Insert or update a repeatable entry (e.g. one trigger, one contact). */
export async function upsertProfileEntry(
  childId: string,
  sectionKey: string,
  entry: Partial<ProfileEntryRow> & { values: ProfileEntryRow['values'] }
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

/**
 * Insert or update the single entry for a non-repeatable section
 * (communication, behavioral_notes, education). Creates the row on
 * first save if it doesn't exist yet.
 */
export async function upsertSingleEntry(
  childId: string,
  sectionKey: string,
  existingId: string | undefined,
  values: ProfileEntryRow['values']
): Promise<ProfileEntryRow> {
  return upsertProfileEntry(childId, sectionKey, { id: existingId, values })
}

/** Set section_visible on every entry in a section (bulk visibility toggle). */
export async function setSectionVisibility(
  entryIds: string[],
  visible: boolean
): Promise<void> {
  if (entryIds.length === 0) return
  const { error } = await supabase
    .from('profile_entries')
    .update({ section_visible: visible })
    .in('id', entryIds)
  if (error) throw error
}

/** Toggle a single entry's visibility (used for per-item show/hide, e.g. one contact). */
export async function setEntryVisibility(id: string, visible: boolean): Promise<void> {
  const { error } = await supabase
    .from('profile_entries')
    .update({ section_visible: visible })
    .eq('id', id)
  if (error) throw error
}

/** Show/hide one field within an entry independently (e.g. hide DOB but keep name). */
export async function setFieldHidden(
  entry: ProfileEntryRow,
  fieldKey: string,
  hidden: boolean
): Promise<ProfileEntryRow> {
  const nextHidden = hidden
    ? [...new Set([...entry.hidden_fields, fieldKey])]
    : entry.hidden_fields.filter(f => f !== fieldKey)

  const { data, error } = await supabase
    .from('profile_entries')
    .update({ hidden_fields: nextHidden })
    .eq('id', entry.id)
    .select()
    .single()
  if (error) throw error
  return data as ProfileEntryRow
}

// ============================================================
// SHARE MANAGEMENT PAGE (initial load)
// ============================================================

export interface ShareManagementData {
  child: ChildRow
  childName: string | null
  auditLog: ShareAuditLogRow[]
  auditTotal: number
}

/** Fetch everything ShareManagementPage needs on mount in one call. */
export async function getShareManagementData(
  childId: string,
  auditPageSize: number
): Promise<ShareManagementData> {
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
    childName: info?.name ?? null,
    auditLog: (log ?? []) as ShareAuditLogRow[],
    auditTotal: count ?? 0,
  }
}

// ============================================================
// AUDIT LOG
// ============================================================

export async function clearAuditLog(childId: string): Promise<void> {
  const { error } = await supabase
    .from('share_audit_log')
    .delete()
    .eq('child_id', childId)
  if (error) throw error
}

/** Fetch one page of audit log entries (for "load more" pagination). */
export async function getAuditLogPage(
  childId: string,
  page: number,
  pageSize: number
): Promise<ShareAuditLogRow[]> {
  const { data, error } = await supabase
    .from('share_audit_log')
    .select('*')
    .eq('child_id', childId)
    .order('viewed_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw error
  return (data ?? []) as ShareAuditLogRow[]
}
