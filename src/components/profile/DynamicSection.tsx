import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from './SectionCard'
import { FieldInput } from './FieldInput'
import { AddItemButton } from '../ui/AddItemButton'
import { FormActions } from '../ui/FormActions'
import { ItemActions } from '../ui/ItemActions'
import { SaveButton } from '../ui/SaveButton'
import { useSaveState } from '../../hooks/useSaveState'
import {
  upsertProfileEntry,
  deleteProfileEntry,
  upsertSingleEntry,
  setSectionVisibility,
  setEmptySectionHidden,
} from '../../lib/db'
import { ALERT_DISPLAY } from '../../lib/types'
import type { SectionDefinition, FieldDefinition, ProfileEntryRow } from '../../lib/types'

interface Props {
  childId: string
  section: SectionDefinition
  fields: FieldDefinition[]
  entries: ProfileEntryRow[]
  onChange: (entries: ProfileEntryRow[]) => void
  /** section_keys the parent hid while they had zero entries — see schema.sql. */
  hiddenEmptySections: string[]
  onHiddenEmptySectionsChange: (next: string[]) => void
}

type Values = ProfileEntryRow['values']

function emptyValues(fields: FieldDefinition[]): Values {
  const v: Values = {}
  for (const f of fields) {
    if (f.field_type === 'boolean') v[f.field_key] = false
    else if (f.field_type === 'text_list') v[f.field_key] = []
    else if (f.field_type === 'select' || f.field_type === 'severity_enum') v[f.field_key] = f.options?.[0]?.value ?? ''
    else v[f.field_key] = ''
  }
  return v
}

function firstRequiredMissing(fields: FieldDefinition[], values: Values): boolean {
  return fields.some(f => f.required && !String(values[f.field_key] ?? '').trim())
}

/**
 * Renders one profile section, driven entirely by its section/field
 * definitions. Replaces the previous per-section components
 * (TriggersSection, SensorySection, RoutinesSection, AlertsSection,
 * EmergencyContactsSection, MedicalSection-ish groupings, Communication/
 * BehavioralNotes/EducationalInfo).
 */
export function DynamicSection({ childId, section, fields, entries, onChange, hiddenEmptySections, onHiddenEmptySectionsChange }: Props) {
  if (!section.repeatable) {
    return <SingleEntrySection childId={childId} section={section} fields={fields} entry={entries[0] ?? null} onChange={e => onChange(e ? [e] : [])} />
  }

  const emptyProps = { hiddenEmptySections, onHiddenEmptySectionsChange }

  if (section.render_hint === 'contact_list') {
    return <ContactListSection childId={childId} section={section} fields={fields} entries={entries} onChange={onChange} {...emptyProps} />
  }

  if (section.render_hint === 'alert_bar') {
    return <AlertBarSection childId={childId} section={section} fields={fields} entries={entries} onChange={onChange} {...emptyProps} />
  }

  return <ListSection childId={childId} section={section} fields={fields} entries={entries} onChange={onChange} {...emptyProps} />
}

// ============================================================
// Generic repeatable list — triggers, sensory, routines, medications,
// conditions, doctors. One card per entry, fields rendered in order.
// ============================================================
function ListSection({ childId, section, fields, entries, onChange, hiddenEmptySections, onHiddenEmptySectionsChange }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newValues, setNewValues] = useState<Values>(() => emptyValues(fields))
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Values>({})
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  // When empty, there's no profile_entries row to hold section_visible, so
  // fall back to the parent's remembered preference for this empty section
  // (see children.hidden_empty_sections in schema.sql) instead of always
  // reading as "visible" with no way to change it.
  const sectionVisible = entries.length > 0
    ? (entries[0]?.section_visible ?? section.default_visible)
    : !hiddenEmptySections.includes(section.section_key)

  const handleAdd = async () => {
    if (firstRequiredMissing(fields, newValues)) return
    setSaving(true)
    try {
      const saved = await upsertProfileEntry(childId, section.section_key, {
        values: newValues,
        sort_order: entries.length,
        // Carry over whatever the parent set while the section was empty.
        section_visible: !hiddenEmptySections.includes(section.section_key),
      })
      onChange([...entries, saved])
      setAdding(false)
      setNewValues(emptyValues(fields))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: ProfileEntryRow) => {
    setEditingId(entry.id)
    setEditValues({ ...entry.values })
  }

  const handleSaveEdit = async (entry: ProfileEntryRow) => {
    const updated = await upsertProfileEntry(childId, section.section_key, { ...entry, values: editValues })
    onChange(entries.map(e => e.id === updated.id ? updated : e))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteProfileEntry(id)
    onChange(entries.filter(e => e.id !== id))
  }

  const handleVisibility = async (visible: boolean) => {
    setVisibilityError(null)
    try {
      if (entries.length === 0) {
        const next = await setEmptySectionHidden(childId, section.section_key, !visible)
        onHiddenEmptySectionsChange(next)
        return
      }
      await setSectionVisibility(entries.map(e => e.id), visible)
      onChange(entries.map(e => ({ ...e, section_visible: visible })))
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <SectionCard title={t(section.label_key)} visible={sectionVisible} onVisibilityChange={handleVisibility}>
      <div className="space-y-3">
        {visibilityError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{visibilityError}</p>
        )}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">—</p>
        )}

        {entries.map(entry => (
          <div key={entry.id} className="border border-slate-100 rounded-xl overflow-hidden">
            {editingId === entry.id ? (
              <div className="p-3 space-y-2">
                {fields.filter(f => f.field_type !== 'priority_int').map((f, i) => (
                  <FieldInput
                    key={f.id}
                    field={f}
                    value={editValues[f.field_key]}
                    onChange={v => setEditValues(prev => ({ ...prev, [f.field_key]: v }))}
                    autoFocus={i === 0}
                  />
                ))}
                <FormActions size="sm" onConfirm={() => handleSaveEdit(entry)} onCancel={() => setEditingId(null)} />
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3">
                <div className="flex-1 min-w-0 space-y-1">
                  {fields.filter(f => f.field_type !== 'priority_int').map((f, i) => {
                    const val = entry.values[f.field_key]
                    if (!val) return null
                    return (
                      <p key={f.id} className={i === 0 ? 'text-sm font-medium text-slate-800' : 'text-xs text-slate-500'}>
                        {String(val)}
                      </p>
                    )
                  })}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <ItemActions onEdit={() => handleEdit(entry)} onDelete={() => handleDelete(entry.id)} />
                </div>
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
            {fields.filter(f => f.field_type !== 'priority_int').map((f, i) => (
              <FieldInput
                key={f.id}
                field={f}
                value={newValues[f.field_key]}
                onChange={v => setNewValues(prev => ({ ...prev, [f.field_key]: v }))}
                autoFocus={i === 0}
              />
            ))}
            <FormActions
              onConfirm={handleAdd}
              onCancel={() => { setAdding(false); setNewValues(emptyValues(fields)) }}
              saving={saving}
              disabled={firstRequiredMissing(fields, newValues)}
            />
          </div>
        ) : (
          <AddItemButton label={`+ ${t(section.label_key)}`} onClick={() => setAdding(true)} />
        )}
      </div>
    </SectionCard>
  )
}

// ============================================================
// Contact list — priority-ordered, numbered, tap-to-call.
// ============================================================
function ContactListSection({ childId, section, fields, entries, onChange, hiddenEmptySections, onHiddenEmptySectionsChange }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newValues, setNewValues] = useState<Values>(() => emptyValues(fields))
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Values>({})
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  // See ListSection's identical comment — no profile_entries row exists to
  // hold section_visible while the list is empty, so fall back to the
  // parent's remembered preference (children.hidden_empty_sections).
  const sectionVisible = entries.length > 0
    ? (entries[0]?.section_visible ?? section.default_visible)
    : !hiddenEmptySections.includes(section.section_key)
  const sorted = [...entries].sort((a, b) => a.sort_order - b.sort_order)
  const displayFields = fields.filter(f => f.field_type !== 'priority_int')

  const handleAdd = async () => {
    if (firstRequiredMissing(fields, newValues)) return
    setSaving(true)
    try {
      const saved = await upsertProfileEntry(childId, section.section_key, {
        values: newValues,
        sort_order: entries.length,
        section_visible: !hiddenEmptySections.includes(section.section_key),
      })
      onChange([...entries, saved])
      setAdding(false)
      setNewValues(emptyValues(fields))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: ProfileEntryRow) => {
    setEditingId(entry.id)
    setEditValues({ ...entry.values })
  }

  const handleSaveEdit = async (entry: ProfileEntryRow) => {
    if (firstRequiredMissing(fields, editValues)) return
    const updated = await upsertProfileEntry(childId, section.section_key, { ...entry, values: editValues })
    onChange(entries.map(e => e.id === updated.id ? updated : e))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteProfileEntry(id)
    onChange(entries.filter(e => e.id !== id))
  }

  const handleVisibility = async (visible: boolean) => {
    setVisibilityError(null)
    try {
      if (entries.length === 0) {
        const next = await setEmptySectionHidden(childId, section.section_key, !visible)
        onHiddenEmptySectionsChange(next)
        return
      }
      await setSectionVisibility(entries.map(e => e.id), visible)
      onChange(entries.map(e => ({ ...e, section_visible: visible })))
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <SectionCard title={t(section.label_key)} visible={sectionVisible} onVisibilityChange={handleVisibility}>
      <div className="space-y-3">
        {visibilityError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{visibilityError}</p>
        )}
        {sorted.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">{t('child.contacts.noContacts')}</p>
        )}

        {sorted.map((contact, index) => (
          <div key={contact.id} className="border border-slate-100 rounded-xl overflow-hidden">
            {editingId === contact.id ? (
              <div className="p-3 space-y-2">
                {displayFields.map((f, i) => (
                  <FieldInput
                    key={f.id}
                    field={f}
                    value={editValues[f.field_key]}
                    onChange={v => setEditValues(prev => ({ ...prev, [f.field_key]: v }))}
                    autoFocus={i === 0}
                  />
                ))}
                <FormActions
                  size="sm"
                  onConfirm={() => handleSaveEdit(contact)}
                  onCancel={() => setEditingId(null)}
                  disabled={firstRequiredMissing(fields, editValues)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-600">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{contact.values.name as string}</p>
                  {contact.values.relation ? <p className="text-xs text-slate-500">{contact.values.relation as string}</p> : null}
                  {contact.values.phone ? (
                    <a href={`tel:${contact.values.phone}`} className="text-sm text-indigo-600 font-medium mt-0.5 block">
                      {contact.values.phone as string}
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <ItemActions onEdit={() => handleEdit(contact)} onDelete={() => handleDelete(contact.id)} />
                </div>
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
            {displayFields.map((f, i) => (
              <FieldInput
                key={f.id}
                field={f}
                value={newValues[f.field_key]}
                onChange={v => setNewValues(prev => ({ ...prev, [f.field_key]: v }))}
                autoFocus={i === 0}
              />
            ))}
            <FormActions
              onConfirm={handleAdd}
              onCancel={() => { setAdding(false); setNewValues(emptyValues(fields)) }}
              saving={saving}
              disabled={firstRequiredMissing(fields, newValues)}
            />
          </div>
        ) : (
          <AddItemButton label={t('child.contacts.addContact')} onClick={() => setAdding(true)} />
        )}
      </div>
    </SectionCard>
  )
}

// ============================================================
// Alerts — severity-coloured cards with type select + optional note.
// ============================================================
function AlertBarSection({ childId, section, fields, entries, onChange, hiddenEmptySections, onHiddenEmptySectionsChange }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newValues, setNewValues] = useState<Values>(() => emptyValues(fields))
  const [saving, setSaving] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  // See ListSection's identical comment — no profile_entries row exists to
  // hold section_visible while there are zero alerts, so fall back to the
  // parent's remembered preference (children.hidden_empty_sections).
  const sectionVisible = entries.length > 0
    ? (entries[0]?.section_visible ?? section.default_visible)
    : !hiddenEmptySections.includes(section.section_key)
  const alertTypeField = fields.find(f => f.field_key === 'alert_type')
  const labelField = fields.find(f => f.field_key === 'label')
  const severityField = fields.find(f => f.field_key === 'severity')
  const noteField = fields.find(f => f.field_key === 'note')

  const alertTypeOptions = alertTypeField?.options ?? []
  const severityFor = (alertType: string) =>
    ALERT_DISPLAY[alertType as keyof typeof ALERT_DISPLAY]?.severity ?? 'red'

  const handleAdd = async () => {
    const alertType = String(newValues.alert_type || alertTypeOptions[0]?.value || 'custom')
    const display = ALERT_DISPLAY[alertType as keyof typeof ALERT_DISPLAY]
    const label = alertType === 'custom' ? (String(newValues.label || '').trim() || display?.defaultLabel) : (display?.defaultLabel ?? alertType)
    setSaving(true)
    try {
      const saved = await upsertProfileEntry(childId, section.section_key, {
        values: {
          alert_type: alertType,
          label,
          severity: display?.severity ?? 'red',
          note: String(newValues.note || '').trim() || null,
        },
        sort_order: entries.length,
        section_visible: !hiddenEmptySections.includes(section.section_key),
      })
      onChange([...entries, saved])
      setAdding(false)
      setNewValues(emptyValues(fields))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteProfileEntry(id)
    onChange(entries.filter(e => e.id !== id))
  }

  const handleSaveNote = async (entry: ProfileEntryRow) => {
    const updated = await upsertProfileEntry(childId, section.section_key, {
      ...entry,
      values: { ...entry.values, note: noteInput.trim() || null },
    })
    onChange(entries.map(e => e.id === updated.id ? updated : e))
    setEditingNoteId(null)
  }

  const handleVisibility = async (visible: boolean) => {
    setVisibilityError(null)
    try {
      if (entries.length === 0) {
        const next = await setEmptySectionHidden(childId, section.section_key, !visible)
        onHiddenEmptySectionsChange(next)
        return
      }
      await setSectionVisibility(entries.map(e => e.id), visible)
      onChange(entries.map(e => ({ ...e, section_visible: visible })))
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const severityColor = (severity: string) =>
    severity === 'red'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-orange-50 border-orange-200 text-orange-800'

  if (!alertTypeField || !severityField) return null

  return (
    <SectionCard
      title={t(section.label_key)}
      visible={sectionVisible}
      onVisibilityChange={handleVisibility}
      hideWarning={t('share.alertsHideWarning')}
    >
      <div className="space-y-3">
        {visibilityError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{visibilityError}</p>
        )}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">{t('child.alerts.noAlerts')}</p>
        )}

        {entries.map(entry => {
          const alertType = String(entry.values.alert_type ?? 'custom')
          const emoji = ALERT_DISPLAY[alertType as keyof typeof ALERT_DISPLAY]?.emoji ?? '⚠️'
          const severity = String(entry.values.severity ?? severityFor(alertType))
          const note = entry.values.note as string | null

          return (
            <div key={entry.id} className={`flex items-start gap-3 border rounded-xl px-3 py-2.5 ${severityColor(severity)}`}>
              <span className="text-lg mt-0.5">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{String(entry.values.label ?? '')}</p>
                {editingNoteId === entry.id ? (
                  <div className="mt-1.5 space-y-1.5">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder={t('child.alerts.notePlaceholder')}
                      className="w-full rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-xs focus:outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleSaveNote(entry)} className="text-xs font-medium underline">{t('common.save')}</button>
                      <button type="button" onClick={() => setEditingNoteId(null)} className="text-xs opacity-60">{t('common.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note && <p className="text-xs mt-0.5 opacity-75">{note}</p>}
                    <button
                      type="button"
                      onClick={() => { setEditingNoteId(entry.id); setNoteInput(note ?? '') }}
                      className="text-xs mt-1 underline opacity-60 hover:opacity-100"
                    >
                      {note ? t('child.alerts.editNote') : t('child.alerts.addNote')}
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                className="text-current opacity-40 hover:opacity-80 transition-opacity text-lg leading-none"
                aria-label={t('common.removeAlert')}
              >
                ×
              </button>
            </div>
          )
        })}

        {adding ? (
          <div className="border border-slate-200 rounded-xl p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('child.alerts.alertType')}</label>
              <select
                value={String(newValues.alert_type || alertTypeOptions[0]?.value || '')}
                onChange={e => setNewValues(prev => ({ ...prev, alert_type: e.target.value }))}
                className="w-full appearance-none rounded-lg border border-slate-200 px-2.5 py-2 pr-8 text-sm bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {alertTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {ALERT_DISPLAY[opt.value as keyof typeof ALERT_DISPLAY]?.emoji ?? ''} {t(opt.label_key)}
                  </option>
                ))}
              </select>
            </div>

            {String(newValues.alert_type) === 'custom' && labelField && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t(labelField.label_key)}</label>
                <input
                  type="text"
                  value={String(newValues.label ?? '')}
                  onChange={e => setNewValues(prev => ({ ...prev, label: e.target.value }))}
                  placeholder={t(labelField.placeholder_key ?? labelField.label_key)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {noteField && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('child.alerts.noteOptional')}</label>
                <input
                  type="text"
                  value={String(newValues.note ?? '')}
                  onChange={e => setNewValues(prev => ({ ...prev, note: e.target.value }))}
                  placeholder={t('child.alerts.notePlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            <FormActions
              onConfirm={handleAdd}
              onCancel={() => { setAdding(false); setNewValues(emptyValues(fields)) }}
              saving={saving}
              disabled={String(newValues.alert_type) === 'custom' && !String(newValues.label ?? '').trim()}
            />
          </div>
        ) : (
          <AddItemButton label={t('child.alerts.addAlert')} onClick={() => setAdding(true)} />
        )}
      </div>
    </SectionCard>
  )
}

// ============================================================
// Single-entry section — communication, behavioral_notes, education.
// One flat form, auto-saves on every field change (matches the
// previous behaviour of CommunicationSection / BehavioralNotesSection).
// ============================================================
function SingleEntrySection({
  childId, section, fields, entry, onChange,
}: {
  childId: string
  section: SectionDefinition
  fields: FieldDefinition[]
  entry: ProfileEntryRow | null
  onChange: (entry: ProfileEntryRow | null) => void
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState<Values>(entry?.values ?? emptyValues(fields))
  const { saving, saved, executeSave } = useSaveState()
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  const isFreeTextOnly = fields.length === 1 && fields[0].field_type === 'longtext'

  const handleFieldChange = (fieldKey: string, value: Values[string]) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }))
  }

  const handleSave = async () => {
    await executeSave(async () => {
      const saved2 = await upsertSingleEntry(childId, section.section_key, entry?.id, values)
      onChange(saved2)
    })
  }

  // Auto-save immediately for boolean/select changes (matches old CommunicationSection UX)
  const handleAutoSaveField = async (fieldKey: string, value: Values[string]) => {
    const next = { ...values, [fieldKey]: value }
    setValues(next)
    await executeSave(async () => {
      const saved2 = await upsertSingleEntry(childId, section.section_key, entry?.id, next)
      onChange(saved2)
    })
  }

  const handleVisibility = async (visible: boolean) => {
    // No row exists yet (nothing entered in this section) — create one so
    // the toggle actually persists, instead of silently no-op'ing. Uses the
    // current in-memory `values` (which may be all-default/empty) rather
    // than discarding them.
    //
    // Errors are surfaced (not swallowed) — this call previously had no
    // try/catch anywhere in its chain, so a failure (RLS rejection, network
    // error, etc.) produced an unhandled promise rejection with zero UI
    // feedback: the toggle would look like it "did nothing" with no way to
    // tell why.
    setVisibilityError(null)
    try {
      const updated = await upsertProfileEntry(childId, section.section_key, {
        ...(entry ?? { values }),
        section_visible: visible,
      })
      onChange(updated)
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <SectionCard
      title={t(section.label_key)}
      visible={entry?.section_visible ?? section.default_visible}
      onVisibilityChange={handleVisibility}
    >
      <div className="space-y-4">
        {visibilityError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{visibilityError}</p>
        )}
        {(saving || saved) && !isFreeTextOnly && (
          <p className="text-xs text-slate-400 text-right">{saving ? t('common.saving') : t('common.saved')}</p>
        )}

        {fields.map(field => {
          if (field.field_type === 'text_list') {
            return (
              <TextListField
                key={field.id}
                field={field}
                value={(values[field.field_key] as string[]) ?? []}
                onChange={v => handleAutoSaveField(field.field_key, v)}
              />
            )
          }
          if (field.field_type === 'boolean') {
            return (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.field_key]}
                onChange={v => handleAutoSaveField(field.field_key, v)}
              />
            )
          }
          if (field.field_type === 'select' || field.field_type === 'severity_enum') {
            return (
              <div key={field.id}>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t(field.label_key)}</label>
                <div className="flex gap-2 flex-wrap">
                  {(field.options ?? []).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAutoSaveField(field.field_key, opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        values[field.field_key] === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {t(opt.label_key)}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t(field.label_key)}</label>
              <FieldInput
                field={field}
                value={values[field.field_key]}
                onChange={v => handleFieldChange(field.field_key, v)}
              />
            </div>
          )
        })}

        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </SectionCard>
  )
}

function TextListField({
  field, value, onChange,
}: {
  field: FieldDefinition
  value: string[]
  onChange: (value: string[]) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  const handleAdd = () => {
    if (!draft.trim()) return
    onChange([...value, draft.trim()])
    setDraft('')
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return
    onChange(value.map((v, i) => i === index ? editingText.trim() : v))
    setEditingIndex(null)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{t(field.label_key)}</label>
      <ul className="space-y-2 mb-2">
        {value.map((item, i) => (
          editingIndex === i ? (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveEdit(i)
                  if (e.key === 'Escape') setEditingIndex(null)
                }}
                className="flex-1 rounded-lg border border-indigo-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
              <button type="button" onClick={() => handleSaveEdit(i)} className="text-xs text-indigo-600 font-medium">{t('common.save')}</button>
              <button type="button" onClick={() => setEditingIndex(null)} className="text-xs text-slate-400">{t('common.cancel')}</button>
            </li>
          ) : (
            <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-slate-700">{item}</span>
              <button type="button" onClick={() => { setEditingIndex(i); setEditingText(item) }} className="text-xs text-slate-400 hover:text-indigo-600">{t('common.edit')}</button>
              <button type="button" onClick={() => handleRemove(i)} className="text-xs text-slate-400 hover:text-red-500">{t('common.delete')}</button>
            </li>
          )
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={t('child.communication.instructionPlaceholder')}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          {t('child.communication.addInstruction')}
        </button>
      </div>
    </div>
  )
}
