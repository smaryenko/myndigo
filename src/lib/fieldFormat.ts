// ============================================================
// Display formatting for dynamic field values — shared by the profile
// editor's read-only rows and the public shared page, so a field_type
// renders the same way everywhere.
// ============================================================

import type { TFunction } from 'i18next'
import type { FieldOption, FieldType, FieldValue } from './types'

/** Minimal field shape both FieldDefinition and SharedField satisfy. */
export interface DisplayField {
  field_key: string
  label_key: string
  field_type: FieldType
  options: FieldOption[] | null
}

/** Field types never shown as a value (priority is derived from list order). */
export function isDisplayable(field: DisplayField): boolean {
  return field.field_type !== 'priority_int'
}

/**
 * Text for a scalar value, or null when there's nothing to show.
 * - select / severity_enum → the option's translated label
 * - boolean → the field's own label when true (e.g. "Echolalia"), nothing when false
 * - text_list → null (render the items individually)
 * - text / longtext / phone → the string itself (callers apply translation)
 */
export function formatFieldValue(field: DisplayField, value: FieldValue | undefined, t: TFunction): string | null {
  if (value === null || value === undefined || value === '') return null
  switch (field.field_type) {
    case 'select':
    case 'severity_enum': {
      const option = field.options?.find(o => o.value === value)
      return option ? t(option.label_key) : String(value)
    }
    case 'boolean':
      return value === true ? t(field.label_key) : null
    case 'text_list':
    case 'priority_int':
      return null
    default:
      return typeof value === 'string' ? (value.trim() ? value : null) : String(value)
  }
}

/**
 * Roles of a contact_list section's fields, by type: the first displayable
 * non-phone field is the name, the first 'phone' field is the number, and
 * everything else is supporting detail (e.g. relation).
 */
export function contactFieldRoles<F extends DisplayField>(fields: F[]) {
  const displayable = fields.filter(isDisplayable)
  const phoneField = displayable.find(f => f.field_type === 'phone')
  const nameField = displayable.find(f => f.field_type !== 'phone')
  const detailFields = displayable.filter(f => f !== phoneField && f !== nameField)
  return { nameField, phoneField, detailFields }
}

/** Non-empty string items of a text_list value. */
export function listItems(value: FieldValue | undefined): string[] {
  return Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()) : []
}
