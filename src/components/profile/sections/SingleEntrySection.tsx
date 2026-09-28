import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '../SectionCard'
import { FieldInput } from '../FieldInput'
import { TextListField } from './TextListField'
import { SaveButton } from '../../ui/SaveButton'
import { InlineError } from '../../ui/InlineError'
import { useSaveState } from '../../../hooks/useSaveState'
import { upsertProfileEntry } from '../../../lib/db'
import { emptyValues } from '../useRepeatableSection'
import { cx } from '../../../lib/cx'
import { PILL, PILL_ACTIVE, PILL_INACTIVE } from '../../../lib/styles'
import type { EntryValues, FieldDefinition, FieldValue, ProfileEntryRow, SectionDefinition } from '../../../lib/types'

interface Props {
  childId: string
  section: SectionDefinition
  fields: FieldDefinition[]
  entry: ProfileEntryRow | null
  onChange: (entry: ProfileEntryRow) => void
}

/** Field types saved as soon as they change (discrete choices); text waits for Save. */
const AUTO_SAVE_TYPES = new Set(['boolean', 'select', 'severity_enum', 'text_list'])

/**
 * Single-entry section — communication, behavioral_notes, education, and
 * any future non-repeatable section. One flat form.
 *
 * Saves are serialized through a queue and always reuse the id returned by
 * the previous save. Without this, two quick clicks before the row existed
 * each inserted a new row (id undefined), creating duplicate entries.
 */
export function SingleEntrySection({ childId, section, fields, entry, onChange }: Props) {
  const { t } = useTranslation()
  const [values, setValues] = useState<EntryValues>(() => ({ ...emptyValues(fields), ...(entry?.values ?? {}) }))
  const [visible, setVisible] = useState(entry?.section_visible ?? section.default_visible)
  const { saving, saved, error, executeSave } = useSaveState()

  const entryIdRef = useRef<string | undefined>(entry?.id)
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())

  /** Persist (values, visibility) after any save already in flight. */
  const persist = (nextValues: EntryValues, nextVisible: boolean) => {
    const job = queueRef.current.catch(() => {}).then(() =>
      executeSave(async () => {
        const row = await upsertProfileEntry(childId, section.section_key, {
          id: entryIdRef.current,
          values: nextValues,
          section_visible: nextVisible,
        })
        entryIdRef.current = row.id
        onChange(row)
      }),
    )
    queueRef.current = job
    return job
  }

  const setField = (fieldKey: string, value: FieldValue, autoSave: boolean) => {
    const next = { ...values, [fieldKey]: value }
    setValues(next)
    if (autoSave) void persist(next, visible)
  }

  const handleVisibility = async (nextVisible: boolean) => {
    // Creates the row if nothing has been entered yet, so the toggle persists.
    const previous = visible
    setVisible(nextVisible)
    const ok = await persist(values, nextVisible)
    if (!ok) setVisible(previous)
  }

  const isFreeTextOnly = fields.length === 1 && fields[0].field_type === 'longtext'
  const hasManualFields = fields.some(f => !AUTO_SAVE_TYPES.has(f.field_type) && f.field_type !== 'priority_int')

  return (
    <SectionCard title={t(section.label_key)} visible={visible} onVisibilityChange={handleVisibility}>
      <div className="space-y-4">
        <InlineError message={error} />
        {(saving || saved) && !isFreeTextOnly && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-end" role="status">{saving ? t('common.saving') : t('common.saved')}</p>
        )}

        {fields.map(field => {
          const autoSave = AUTO_SAVE_TYPES.has(field.field_type)
          if (field.field_type === 'text_list') {
            return (
              <TextListField
                key={field.id}
                field={field}
                value={Array.isArray(values[field.field_key]) ? (values[field.field_key] as string[]) : []}
                onChange={v => setField(field.field_key, v, true)}
              />
            )
          }
          if (field.field_type === 'select' || field.field_type === 'severity_enum') {
            return (
              <fieldset key={field.id}>
                <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t(field.label_key)}</legend>
                <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={t(field.label_key)}>
                  {(field.options ?? []).map(opt => {
                    const selected = values[field.field_key] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setField(field.field_key, opt.value, true)}
                        className={cx(PILL, selected ? PILL_ACTIVE : PILL_INACTIVE)}
                      >
                        {t(opt.label_key)}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          }
          return (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.field_key]}
              onChange={v => setField(field.field_key, v, autoSave)}
              labelMode={isFreeTextOnly ? 'sr-only' : 'visible'}
            />
          )
        })}

        {hasManualFields && (
          <SaveButton saving={saving} saved={saved} onClick={() => void persist(values, visible)} />
        )}
      </div>
    </SectionCard>
  )
}
