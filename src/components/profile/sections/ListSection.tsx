import { useTranslation } from 'react-i18next'
import { SectionCard } from '../SectionCard'
import { EntryForm } from './EntryForm'
import { AddItemButton } from '../../ui/AddItemButton'
import { InlineError } from '../../ui/InlineError'
import { ItemActions } from '../../ui/ItemActions'
import { hasMissingRequired, useRepeatableSection, type RepeatableSectionProps } from '../useRepeatableSection'
import { formatFieldValue, isDisplayable } from '../../../lib/fieldFormat'

/**
 * Generic repeatable list — triggers, sensory, routines, medications,
 * conditions, doctors, and any future list section. One card per entry,
 * fields rendered in definition order.
 */
export function ListSection(props: RepeatableSectionProps) {
  const { t } = useTranslation()
  const { section, fields } = props
  const s = useRepeatableSection(props)
  const displayFields = fields.filter(isDisplayable)

  return (
    <SectionCard title={t(section.label_key)} visible={s.sectionVisible} onVisibilityChange={s.setVisibility}>
      <div className="space-y-3">
        <InlineError message={s.error} />
        {s.sorted.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">{t('child.medical.noneAdded')}</p>
        )}

        <ul className="space-y-3">
          {s.sorted.map(entry => {
            const lines = displayFields
              .map(f => ({ key: f.id, text: formatFieldValue(f, entry.values[f.field_key], t) }))
              .filter((l): l is { key: string; text: string } => l.text !== null)
            return (
              <li key={entry.id} className="border border-slate-100 rounded-xl overflow-hidden">
                {s.editingId === entry.id ? (
                  <EntryForm
                    size="sm"
                    fields={fields}
                    values={s.editValues}
                    onChange={s.setEditValue}
                    onConfirm={() => s.saveEdit(entry)}
                    onCancel={s.cancelEdit}
                    saving={s.busy}
                    disabled={hasMissingRequired(fields, s.editValues)}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      {lines.map((line, i) => (
                        <p key={line.key} className={i === 0 ? 'text-sm font-medium text-slate-800' : 'text-xs text-slate-500 whitespace-pre-wrap'}>
                          {line.text}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <ItemActions
                        itemLabel={lines[0]?.text}
                        onEdit={() => s.startEdit(entry)}
                        onDelete={() => s.remove(entry.id)}
                      />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {s.adding ? (
          <EntryForm
            fields={fields}
            values={s.newValues}
            onChange={s.setNewValue}
            onConfirm={() => s.add()}
            onCancel={s.cancelAdding}
            saving={s.busy}
            disabled={hasMissingRequired(fields, s.newValues)}
          />
        ) : (
          <AddItemButton label={`+ ${t(section.label_key)}`} onClick={s.startAdding} />
        )}
      </div>
    </SectionCard>
  )
}
