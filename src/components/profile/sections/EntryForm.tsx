import { FieldInput } from '../FieldInput'
import { FormActions } from '../../ui/FormActions'
import { isDisplayable } from '../../../lib/fieldFormat'
import { cx } from '../../../lib/cx'
import type { EntryValues, FieldDefinition, FieldValue } from '../../../lib/types'

interface Props {
  fields: FieldDefinition[]
  values: EntryValues
  onChange: (fieldKey: string, value: FieldValue) => void
  onConfirm: () => void
  onCancel: () => void
  saving?: boolean
  disabled?: boolean
  /** 'md' — add form (bordered box). 'sm' — inline edit inside an item. */
  size?: 'md' | 'sm'
}

/** Inputs for every editable field of an entry, plus save/cancel. */
export function EntryForm({ fields, values, onChange, onConfirm, onCancel, saving, disabled, size = 'md' }: Props) {
  const editable = fields.filter(f => isDisplayable(f) && f.field_type !== 'text_list')
  return (
    <div className={cx('space-y-2', size === 'md' ? 'border border-slate-200 rounded-xl p-3' : 'p-3')}>
      {editable.map((f, i) => (
        <FieldInput
          key={f.id}
          field={f}
          value={values[f.field_key]}
          onChange={v => onChange(f.field_key, v)}
          autoFocus={i === 0}
        />
      ))}
      <FormActions size={size} onConfirm={onConfirm} onCancel={onCancel} saving={saving} disabled={disabled} />
    </div>
  )
}
