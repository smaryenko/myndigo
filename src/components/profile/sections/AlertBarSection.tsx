import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '../SectionCard'
import { FieldInput } from '../FieldInput'
import { AddItemButton } from '../../ui/AddItemButton'
import { FormActions } from '../../ui/FormActions'
import { InlineError } from '../../ui/InlineError'
import { ItemActions } from '../../ui/ItemActions'
import { useRepeatableSection, type RepeatableSectionProps } from '../useRepeatableSection'
import { alertDisplay } from '../../../lib/types'
import type { EntryValues, ProfileEntryRow } from '../../../lib/types'
import { alertEmoji, alertLabel, alertSeverity } from '../../../lib/alerts'
import { cx } from '../../../lib/cx'
import { LABEL_SM, SELECT_SM } from '../../../lib/styles'

const SEVERITY_CARD = {
  red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200',
  orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-200',
}

/**
 * Alerts — severity-coloured cards with an alert-type select, a label for
 * custom alerts and an optional note. Hiding the section asks first.
 *
 * Built-in alert types store no label (it's derived from the alert_type
 * option at render time, so it's always in the viewer's language); only
 * 'custom' alerts store the parent's own text.
 */
export function AlertBarSection(props: RepeatableSectionProps) {
  const { t } = useTranslation()
  const { fields } = props
  const s = useRepeatableSection(props)
  const typeSelectId = useId()
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  const alertTypeField = fields.find(f => f.field_key === 'alert_type')
  const labelField = fields.find(f => f.field_key === 'label')
  const noteField = fields.find(f => f.field_key === 'note')
  const options = alertTypeField?.options ?? []

  if (!alertTypeField) return null

  const newType = String(s.newValues.alert_type || options[0]?.value || 'custom')
  const newLabel = String(s.newValues.label ?? '').trim()
  const newNote = String(s.newValues.note ?? '').trim()
  const isCustom = newType === 'custom'

  const handleAdd = () => {
    const values: EntryValues = {
      alert_type: newType,
      severity: alertDisplay(newType).severity,
      note: newNote || null,
    }
    if (isCustom) values.label = newLabel
    return s.add(values)
  }

  const handleSaveNote = async (entry: ProfileEntryRow) => {
    const ok = await s.saveEdit(entry, { ...entry.values, note: noteInput.trim() || null })
    if (ok) setEditingNoteId(null)
  }

  return (
    <SectionCard
      title={t(props.section.label_key)}
      visible={s.sectionVisible}
      onVisibilityChange={s.setVisibility}
      hideWarning={t('share.alertsHideWarning')}
    >
      <div className="space-y-3">
        <InlineError message={s.error} />
        {s.sorted.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">{t('child.alerts.noAlerts')}</p>
        )}

        <ul className="space-y-3">
          {s.sorted.map(entry => {
            const label = alertLabel(entry.values, options, t)
            const note = typeof entry.values.note === 'string' ? entry.values.note : null
            return (
              <li
                key={entry.id}
                className={cx('flex items-start gap-3 border rounded-xl px-3 py-2.5', SEVERITY_CARD[alertSeverity(entry.values)])}
              >
                <span className="text-lg mt-0.5" aria-hidden="true">{alertEmoji(entry.values)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{label}</p>
                  {editingNoteId === entry.id ? (
                    <div className="mt-1.5 space-y-1.5">
                      <input
                        type="text"
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        placeholder={t('child.alerts.notePlaceholder')}
                        aria-label={`${t('child.alerts.note')}: ${label}`}
                        className="w-full rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSaveNote(entry)} disabled={s.busy} className="text-xs font-medium underline disabled:opacity-50">
                          {t('common.save')}
                        </button>
                        <button type="button" onClick={() => setEditingNoteId(null)} className="text-xs opacity-60">
                          {t('common.cancel')}
                        </button>
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
                <div className="flex gap-2 flex-shrink-0">
                  <ItemActions itemLabel={label} onDelete={() => s.remove(entry.id)} />
                </div>
              </li>
            )
          })}
        </ul>

        {s.adding ? (
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 space-y-3">
            <div>
              <label htmlFor={typeSelectId} className={LABEL_SM}>{t('child.alerts.alertType')}</label>
              <select
                id={typeSelectId}
                value={newType}
                onChange={e => s.setNewValue('alert_type', e.target.value)}
                className={SELECT_SM}
                autoFocus
              >
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {alertDisplay(opt.value).emoji} {t(opt.label_key)}
                  </option>
                ))}
              </select>
            </div>

            {isCustom && labelField && (
              <FieldInput
                field={labelField}
                value={s.newValues.label}
                onChange={v => s.setNewValue('label', v)}
                labelMode="visible"
              />
            )}

            {noteField && (
              <FieldInput
                field={noteField}
                value={s.newValues.note}
                onChange={v => s.setNewValue('note', v)}
                labelMode="visible"
              />
            )}

            <FormActions
              onConfirm={handleAdd}
              onCancel={s.cancelAdding}
              saving={s.busy}
              disabled={isCustom && !newLabel}
            />
          </div>
        ) : (
          <AddItemButton label={t('child.alerts.addAlert')} onClick={s.startAdding} />
        )}
      </div>
    </SectionCard>
  )
}
