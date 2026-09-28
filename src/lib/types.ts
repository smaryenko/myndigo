// ============================================================
// Myndigo — Database Types
// Hand-maintained mirror of supabase/schema.sql. When the schema
// changes, update these in the same change. (Generating them with
// `supabase gen types typescript` is the planned replacement.)
// ============================================================

export type AlertType =
  | 'food_allergy'
  | 'epilepsy'
  | 'diabetes'
  | 'asthma'
  | 'elopement_risk'
  | 'non_swimmer'
  | 'heart_condition'
  | 'custom'

export type AlertSeverity = 'red' | 'orange'

// ============================================================
// Row types — shape of data coming from Supabase
// ============================================================

export type ShareTheme = 'professional' | 'warm' | 'playful' | (string & {})

/** profile_type is a plain text tag, e.g. 'asd_child'. Not constrained by a lookup table. */
export type ProfileType = 'asd_child' | (string & {})

export interface ChildRow {
  id: string
  user_id: string
  share_token: string
  sharing_enabled: boolean
  share_language: string
  share_theme: ShareTheme
  profile_type: ProfileType
  /** section_keys hidden by the parent while they had zero entries (see schema.sql). */
  hidden_empty_sections: string[]
  created_at: string
  updated_at: string
}

/** Dashboard list item: a child plus the bits of personal_info shown on the card. */
export type ChildSummary = ChildRow & { name: string; photo_base64: string | null }

export interface PersonalInfoRow {
  id: string
  child_id: string
  name: string
  date_of_birth: string | null
  pronouns: string | null
  photo_base64: string | null
  photo_visible: boolean
  section_visible: boolean
  updated_at: string
}

// ============================================================
// Dynamic profile schema — section/field definitions
// ============================================================

export type RenderHint = 'list' | 'single' | 'alert_bar' | 'contact_list'

export type FieldType =
  | 'text'
  | 'longtext'
  | 'select'
  | 'boolean'
  | 'phone'
  | 'severity_enum'
  | 'priority_int'
  | 'text_list'

export interface FieldOption {
  value: string
  label_key: string
}

export interface SectionDefinition {
  id: string
  profile_type: ProfileType
  section_key: string
  label_key: string
  /** Title on the shared page; falls back to label_key. */
  share_label_key: string | null
  /** Sections sharing this key render together in one shared-page card. */
  share_group_label_key: string | null
  repeatable: boolean
  render_hint: RenderHint
  sort_order: number
  default_visible: boolean
}

export interface FieldDefinition {
  id: string
  section_id: string
  field_key: string
  /** i18n key for the <label> shown above the input */
  label_key: string
  /** i18n key for input placeholder text; falls back to label_key if null */
  placeholder_key: string | null
  field_type: FieldType
  options: FieldOption[] | null
  required: boolean
  translatable: boolean
  can_hide_independently: boolean
  sort_order: number
}

// ============================================================
// PROFILE ENTRIES
// One row per entry per section per child. `values` is keyed by
// field_key; its shape is defined by field_definitions.
// ============================================================

export type FieldValue = string | boolean | string[] | number | null
export type EntryValues = Record<string, FieldValue>

export interface ProfileEntryRow {
  id: string
  child_id: string
  section_key: string
  sort_order: number
  section_visible: boolean
  hidden_fields: string[]
  values: EntryValues
  created_at: string
  updated_at: string
}

export interface ShareAuditLogRow {
  id: string
  child_id: string
  viewed_at: string
  user_agent: string | null
  latitude: number | null
  longitude: number | null
  geo_source: 'browser' | 'ip' | null
  ip_city: string | null
  ip_country: string | null
}

// ============================================================
// Composite types used by pages
// ============================================================

export interface ChildProfile {
  child: ChildRow
  personalInfo: PersonalInfoRow | null
  /** All dynamic entries for this child, across every section_key. */
  entries: ProfileEntryRow[]
  /** Section layout/order for this child's profile_type. */
  sections: SectionDefinition[]
  /** Field definitions for this child's profile_type, keyed by section_key. */
  fieldsBySection: Record<string, FieldDefinition[]>
}

export interface ShareManagementData {
  child: ChildRow
  childName: string | null
  auditLog: ShareAuditLogRow[]
  auditTotal: number
}

// ============================================================
// Shared (public, no-login) profile — the narrow shape returned by
// get_shared_profile(). Hidden data has already been removed
// server-side: personalInfo is null when its section is hidden,
// photo_base64 is null when the photo is hidden, only visible entries
// are included, and hidden_fields are stripped from `values`.
// ============================================================

export interface SharedChildInfo {
  id: string
  share_language: string
  share_theme: ShareTheme
  profile_type: ProfileType
}

export interface SharedPersonalInfo {
  name: string
  date_of_birth: string | null
  pronouns: string | null
  photo_base64: string | null
}

export interface SharedField {
  field_key: string
  label_key: string
  field_type: FieldType
  options: FieldOption[] | null
  translatable: boolean
  sort_order: number
}

export interface SharedSection {
  section_key: string
  label_key: string
  share_label_key: string | null
  share_group_label_key: string | null
  repeatable: boolean
  render_hint: RenderHint
  sort_order: number
  fields: SharedField[]
}

export interface SharedProfileEntry {
  id: string
  section_key: string
  sort_order: number
  values: EntryValues
}

export interface SharedProfile {
  child: SharedChildInfo
  personalInfo: SharedPersonalInfo | null
  sections: SharedSection[]
  entries: SharedProfileEntry[]
}

// ============================================================
// Alert display metadata (icon + default severity per alert type).
// alert_type values and their labels live in field_definitions.options.
// ============================================================

export const ALERT_DISPLAY: Record<AlertType, { emoji: string; severity: AlertSeverity }> = {
  food_allergy:    { emoji: '🍽️', severity: 'red' },
  epilepsy:        { emoji: '⚡', severity: 'orange' },
  diabetes:        { emoji: '💉', severity: 'orange' },
  asthma:          { emoji: '🫁', severity: 'orange' },
  elopement_risk:  { emoji: '🚪', severity: 'red' },
  non_swimmer:     { emoji: '🌊', severity: 'red' },
  heart_condition: { emoji: '❤️', severity: 'red' },
  custom:          { emoji: '⚠️', severity: 'red' },
}

export function alertDisplay(alertType: unknown) {
  return ALERT_DISPLAY[alertType as AlertType] ?? ALERT_DISPLAY.custom
}
