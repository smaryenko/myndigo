import { useTranslation } from 'react-i18next'
import { SectionCard } from '../SectionCard'
import { EntryForm } from './EntryForm'
import { AddItemButton } from '../../ui/AddItemButton'
import { InlineError } from '../../ui/InlineError'
import { ItemActions } from '../../ui/ItemActions'
import { hasMissingRequired, useRepeatableSection, type RepeatableSectionProps } from '../useRepeatableSection'
import { contactFieldRoles, formatFieldValue } from '../../../lib/fieldFormat'

/**
 * Emergency contacts — numbered in priority order (sort_order), tap-to-call,
 * reorderable. The first two are the "call first" buttons on the shared page,
 * so the parent needs to be able to choose them.
 *
 * Layout is driven by field types: the first non-phone field is the name,
 * the first 'phone' field is the tap-to-call number, the rest are details.
 */
export function ContactListSection(props: RepeatableSectionProps) {
  const { t } = useTranslation()
  const { fields } = props
  const s = useRepeatableSection(props)
  const { nameField, phoneField, detailFields } = contactFieldRoles(fields)

  return (
    <SectionCard title={t(props.section.label_key)} visible={s.sectionVisible} onVisibilityChange={s.setVisibility}>
      <div className="space-y-3">
        <InlineError message={s.error} />
        {s.sorted.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">{t('child.contacts.noContacts')}</p>
        )}

        <ol className="space-y-3">
          {s.sorted.map((contact, index) => {
            const name = nameField ? formatFieldValue(nameField, contact.values[nameField.field_key], t) ?? '' : ''
            const phone = phoneField ? formatFieldValue(phoneField, contact.values[phoneField.field_key], t) : null
            const details = detailFields
              .map(f => formatFieldValue(f, contact.values[f.field_key], t))
              .filter((d): d is string => d !== null)
            return (
              <li key={contact.id} className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                {s.editingId === contact.id ? (
                  <EntryForm
                    size="sm"
                    fields={fields}
                    values={s.editValues}
                    onChange={s.setEditValue}
                    onConfirm={() => s.saveEdit(contact)}
                    onCancel={s.cancelEdit}
                    saving={s.busy}
                    disabled={hasMissingRequired(fields, s.editValues)}
                  />
                ) : (
                  <div className="flex items-center gap-3 px-3 py-3">
                    <div
                      className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
                      {details.map(d => <p key={d} className="text-xs text-slate-500 dark:text-slate-400">{d}</p>)}
                      {phone && (
                        <a href={`tel:${phone}`} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block" dir="ltr">
                          {phone}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 items-center">
                      <ItemActions
                        itemLabel={name}
                        onMoveUp={index > 0 ? () => s.move(contact.id, -1) : undefined}
                        onMoveDown={index < s.sorted.length - 1 ? () => s.move(contact.id, 1) : undefined}
                        onEdit={() => s.startEdit(contact)}
                        onDelete={() => s.remove(contact.id)}
                      />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>

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
          <AddItemButton label={t('child.contacts.addContact')} onClick={s.startAdding} />
        )}
      </div>
    </SectionCard>
  )
}
