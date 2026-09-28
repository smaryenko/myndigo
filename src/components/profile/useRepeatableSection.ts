import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteProfileEntry,
  nextSortOrder,
  reorderProfileEntries,
  setEmptySectionHidden,
  setSectionVisibility,
  upsertProfileEntry,
} from '../../lib/db'
import { toUserMessage } from '../../lib/errors'
import type { EntryValues, FieldDefinition, FieldValue, ProfileEntryRow, SectionDefinition } from '../../lib/types'

export interface RepeatableSectionProps {
  childId: string
  section: SectionDefinition
  fields: FieldDefinition[]
  entries: ProfileEntryRow[]
  onChange: (entries: ProfileEntryRow[]) => void
  /** section_keys the parent hid while they had zero entries — see schema.sql. */
  hiddenEmptySections: string[]
  onHiddenEmptySectionsChange: (next: string[]) => void
}

/** Default values for a new entry, based on each field's type. */
export function emptyValues(fields: FieldDefinition[]): EntryValues {
  const v: EntryValues = {}
  for (const f of fields) {
    if (f.field_type === 'boolean') v[f.field_key] = false
    else if (f.field_type === 'text_list') v[f.field_key] = []
    else if (f.field_type === 'select' || f.field_type === 'severity_enum') v[f.field_key] = f.options?.[0]?.value ?? ''
    else if (f.field_type !== 'priority_int') v[f.field_key] = ''
  }
  return v
}

/** True if any required field is empty. */
export function hasMissingRequired(fields: FieldDefinition[], values: EntryValues): boolean {
  return fields.some(f => f.required && !String(values[f.field_key] ?? '').trim())
}

/**
 * All state and actions shared by every repeatable section variant
 * (generic list, contacts, alerts): add form, inline edit, delete,
 * reorder and the section visibility toggle — with every failure
 * surfaced through `error` instead of an unhandled rejection.
 */
export function useRepeatableSection({
  childId,
  section,
  fields,
  entries,
  onChange,
  hiddenEmptySections,
  onHiddenEmptySectionsChange,
}: RepeatableSectionProps) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newValues, setNewValues] = useState<EntryValues>(() => emptyValues(fields))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EntryValues>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sectionKey = section.section_key
  const hiddenWhileEmpty = hiddenEmptySections.includes(sectionKey)
  const sorted = [...entries].sort((a, b) => a.sort_order - b.sort_order)

  // No profile_entries row exists to hold section_visible while the section
  // is empty, so fall back to the parent's remembered preference
  // (children.hidden_empty_sections) instead of always reading "visible".
  const sectionVisible = sorted.length > 0
    ? (sorted[0]?.section_visible ?? section.default_visible)
    : !hiddenWhileEmpty

  /** Runs an action, recording a user-safe error message on failure. */
  const run = async (action: () => Promise<void>, fallbackKey = 'common.saveFailed'): Promise<boolean> => {
    setError(null)
    setBusy(true)
    try {
      await action()
      return true
    } catch (err) {
      setError(toUserMessage(err, t(fallbackKey)))
      return false
    } finally {
      setBusy(false)
    }
  }

  const startAdding = () => { setAdding(true); setNewValues(emptyValues(fields)) }
  const cancelAdding = () => { setAdding(false); setNewValues(emptyValues(fields)) }
  const setNewValue = (key: string, value: FieldValue) => setNewValues(prev => ({ ...prev, [key]: value }))

  /** Insert a new entry. `values` defaults to the add form's values. */
  const add = (values: EntryValues = newValues) =>
    run(async () => {
      const saved = await upsertProfileEntry(childId, sectionKey, {
        values,
        sort_order: nextSortOrder(entries),
        // Carry over whatever the parent chose while the section was empty.
        section_visible: !hiddenWhileEmpty,
      })
      onChange([...entries, saved])
      setAdding(false)
      setNewValues(emptyValues(fields))
    })

  const startEdit = (entry: ProfileEntryRow) => { setEditingId(entry.id); setEditValues({ ...entry.values }) }
  const cancelEdit = () => setEditingId(null)
  const setEditValue = (key: string, value: FieldValue) => setEditValues(prev => ({ ...prev, [key]: value }))

  /** Update an existing entry. `values` defaults to the edit form's values. */
  const saveEdit = (entry: ProfileEntryRow, values: EntryValues = editValues) =>
    run(async () => {
      const updated = await upsertProfileEntry(childId, sectionKey, { id: entry.id, values })
      onChange(entries.map(e => (e.id === updated.id ? updated : e)))
      setEditingId(null)
    })

  const remove = (id: string) =>
    run(async () => {
      await deleteProfileEntry(id)
      onChange(entries.filter(e => e.id !== id))
    }, 'common.deleteFailed')

  /** Move an entry one position up (-1) or down (+1) and renumber the section. */
  const move = (id: string, direction: -1 | 1) =>
    run(async () => {
      const ids = sorted.map(e => e.id)
      const from = ids.indexOf(id)
      const to = from + direction
      if (from < 0 || to < 0 || to >= ids.length) return
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      await reorderProfileEntries(childId, sectionKey, ids)
      const orderOf = new Map(ids.map((entryId, index) => [entryId, index]))
      onChange(entries.map(e => ({ ...e, sort_order: orderOf.get(e.id) ?? e.sort_order })))
    })

  const setVisibility = (visible: boolean) =>
    run(async () => {
      if (entries.length === 0) {
        onHiddenEmptySectionsChange(await setEmptySectionHidden(childId, sectionKey, !visible))
        return
      }
      await setSectionVisibility(entries.map(e => e.id), visible)
      onChange(entries.map(e => ({ ...e, section_visible: visible })))
    })

  return {
    sorted,
    sectionVisible,
    busy,
    error,
    // add form
    adding, startAdding, cancelAdding, newValues, setNewValue, add,
    // inline edit
    editingId, editValues, startEdit, cancelEdit, setEditValue, saveEdit,
    // other actions
    remove, move, setVisibility,
  }
}
