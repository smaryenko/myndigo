import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../lib/cx'
import { INPUT_SM, LABEL, SELECT_SM } from '../../lib/styles'
import type { FieldDefinition, FieldValue } from '../../lib/types'

interface Props {
  field: FieldDefinition
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  autoFocus?: boolean
  /**
   * 'visible' — label above the input (single-entry forms).
   * 'sr-only' — label announced to screen readers only (compact add/edit rows,
   * where the placeholder is the visual cue).
   */
  labelMode?: 'visible' | 'sr-only'
}

/**
 * Renders the correct input widget (with an associated <label>) for one
 * field, based on field.field_type. This is the one place that needs a new
 * case whenever a genuinely new field_type is introduced — which fields
 * exist, in what order, for which section is pure data in field_definitions.
 *
 * Not handled here: 'priority_int' (derived from list order) and
 * 'text_list' (see TextListField).
 */
export function FieldInput({ field, value, onChange, autoFocus, labelMode = 'sr-only' }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const label = t(field.label_key)
  const placeholder = t(field.placeholder_key ?? field.label_key)
  const labelClass = labelMode === 'visible' ? LABEL : 'sr-only'
  const text = typeof value === 'string' ? value : ''

  if (field.field_type === 'priority_int' || field.field_type === 'text_list') return null

  if (field.field_type === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 accent-indigo-600"
        />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
    )
  }

  let control
  switch (field.field_type) {
    case 'longtext':
      control = (
        <textarea
          id={id}
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          autoFocus={autoFocus}
          className={cx(INPUT_SM, 'resize-none')}
        />
      )
      break
    case 'select':
    case 'severity_enum':
      control = (
        <select
          id={id}
          value={text || (field.options?.[0]?.value ?? '')}
          onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus}
          className={SELECT_SM}
        >
          {(field.options ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{t(opt.label_key)}</option>
          ))}
        </select>
      )
      break
    case 'phone':
      control = (
        <input
          id={id}
          type="tel"
          autoComplete="tel"
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={INPUT_SM}
        />
      )
      break
    default:
      control = (
        <input
          id={id}
          type="text"
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={INPUT_SM}
        />
      )
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {field.required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      {control}
    </div>
  )
}
