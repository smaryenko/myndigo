// ============================================================
// Myndigo — Database Types
// Mirror of supabase/schema.sql
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

export type CommunicationLevel = 'verbal' | 'limited_verbal' | 'non_verbal'

export type SensoryType = 'sound' | 'light' | 'touch' | 'smell' | 'taste' | 'movement'

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
  created_at: string
  updated_at: string
}

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

/** A field_definitions row joined with its parent section_key, as consumed by the frontend. */
export interface FieldDefinitionWithSection extends FieldDefinition {
  section_key: string
}

// ============================================================
// PROFILE ENTRIES
// The actual data. One row per entry per section per child.
// `values` is keyed by field_key, shape defined by field_definitions
// for that section_key + profile_type.
// ============================================================
export interface ProfileEntryRow {
  id: string
  child_id: string
  section_key: string
  sort_order: number
  section_visible: boolean
  hidden_fields: string[]
  // `number` included for 'priority_int' fields (e.g. contacts.priority) —
  // previously missing from this union despite priority_int existing in
  // field_definitions, meaning numeric values had no correct type here.
  values: Record<string, string | boolean | string[] | number | null>
  created_at: string
  updated_at: string
}

export interface ContentTranslationRow {
  id: string
  child_id: string
  field_path: string
  source_lang: string
  target_lang: string
  translated_text: string
  provider_used: string
  created_at: string
}

export interface ShareAuditLogRow {
  id: string
  child_id: string
  viewed_at: string
  user_agent: string | null
  latitude: number | null
  longitude: number | null
  geo_source: string | null
  ip_city: string | null
  ip_country: string | null
}

// ============================================================
// Composite type — full child profile as used in the app
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

// ============================================================
// Shared (public, no-login) profile — the narrow shape returned by the
// get_shared_profile() Postgres function. Deliberately NOT the same as
// ChildProfile: only the columns the shared page actually renders are
// included, and hidden_fields have already been stripped out of each
// entry's `values` server-side (see schema.sql get_shared_profile).
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
  photo_visible: boolean
  section_visible: boolean
}

export interface SharedProfileEntry {
  id: string
  section_key: string
  sort_order: number
  section_visible: boolean
  hidden_fields: string[]
  values: Record<string, string | boolean | string[] | number | null>
}

export interface SharedProfile {
  child: SharedChildInfo
  personalInfo: SharedPersonalInfo | null
  entries: SharedProfileEntry[]
}

// ============================================================
// Alert display metadata (icons, colours)
// Still used by AlertsSection/SharedProfilePage for icon+colour lookup;
// alert_type values themselves now live in field_definitions.options.
// ============================================================

export const ALERT_DISPLAY: Record<AlertType, { emoji: string; defaultLabel: string; severity: AlertSeverity }> = {
  food_allergy:     { emoji: '🍽️', defaultLabel: 'Food Allergy',      severity: 'red' },
  epilepsy:         { emoji: '⚡', defaultLabel: 'Epilepsy',           severity: 'orange' },
  diabetes:         { emoji: '💉', defaultLabel: 'Diabetes',           severity: 'orange' },
  asthma:           { emoji: '🫁', defaultLabel: 'Asthma',             severity: 'orange' },
  elopement_risk:   { emoji: '🚪', defaultLabel: 'Elopement Risk',     severity: 'red' },
  non_swimmer:      { emoji: '🌊', defaultLabel: 'Non-Swimmer',        severity: 'red' },
  heart_condition:  { emoji: '❤️', defaultLabel: 'Heart Condition',    severity: 'red' },
  custom:           { emoji: '⚠️', defaultLabel: 'Alert',              severity: 'red' },
}

export const COMMUNICATION_LABELS: Record<CommunicationLevel, string> = {
  verbal:         'verbal',
  limited_verbal: 'limited_verbal',
  non_verbal:     'non_verbal',
}

export const SENSORY_LABELS: Record<SensoryType, string> = {
  sound:    'sound',
  light:    'light',
  touch:    'touch',
  smell:    'smell',
  taste:    'taste',
  movement: 'movement',
}
