import { useTranslation } from 'react-i18next'
import { INPUT_SM } from '../../lib/cn'
import type { FieldDefinition } from '../../lib/types'

type FieldValue = string | boolean | string[] | number | null

interface Props {
  field: FieldDefinition
  value: FieldValue
  onChange: (value: FieldValue) => void
  autoFocus?: boolean
}

/**
 * Renders the correct input widget for a single field, based on
 * field.field_type. This is the one place that needs a new case
 * whenever a genuinely new field_type is introduced — everything
 * else (which fields exist, in what order, for which section) is
 * pure data in field_definitions.
 */
export function FieldInput({ field, value, onChange, autoFocus }: Props) {
  const { t } = useTranslation()
  const label = t(field.label_key)
  const placeholder = t(field.placeholder_key ?? field.label_key)

  switch (field.field_type) {
    case 'longtext':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      )

    case 'select':
    case 'severity_enum':
      return (
        <select
          value={(value as string) ?? field.options?.[0]?.value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 px-2.5 py-2 pr-8 text-sm bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {(field.options ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{t(opt.label_key)}</option>
          ))}
        </select>
      )

    case 'boolean':
      return (
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-sm text-slate-700">{label}</span>
        </label>
      )

    case 'phone':
      return (
        <input
          type="tel"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={INPUT_SM}
        />
      )

    case 'priority_int':
      // Priority is derived from list order, not directly editable as a field.
      return null

    case 'text_list':
      // Handled by the caller (list-of-strings editor), not a plain widget.
      return null

    case 'text':
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={INPUT_SM}
        />
      )
  }
}
