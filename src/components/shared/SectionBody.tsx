import { useTranslation } from 'react-i18next'
import { isDisplayable } from '../../lib/fieldFormat'
import { cx } from '../../lib/cx'
import type { SharedField, SharedProfileEntry, SharedSection } from '../../lib/types'
import { fieldListItems, fieldText, type Tx } from './sharedModel'
import type { ThemeConfig } from './sharedThemes'

interface Props {
  section: SharedSection
  entries: SharedProfileEntry[]
  tx: Tx
  theme: ThemeConfig
}

/**
 * Generic, definition-driven rendering of one section's entries — used for
 * every section without a dedicated shared-page layout, so a section or
 * field added to field_definitions appears here with no code change.
 *
 * Repeatable sections: one item per entry, first field as the title.
 * Single-entry sections: label/value rows (or just the text, if the
 * section has a single free-text field).
 */
export function SectionBody({ section, entries, tx, theme }: Props) {
  const fields = section.fields.filter(isDisplayable)
  if (!section.repeatable) {
    const entry = entries[0]
    return entry ? <SingleEntryBody section={section} fields={fields} entry={entry} tx={tx} theme={theme} /> : null
  }
  return (
    <ul className="space-y-1">
      {entries.map(entry => (
        <li key={entry.id} className={cx('py-2 border-b last:border-0', theme.divider)}>
          <EntryLines section={section} fields={fields} entry={entry} tx={tx} theme={theme} />
        </li>
      ))}
    </ul>
  )
}

interface EntryProps {
  section: SharedSection
  fields: SharedField[]
  entry: SharedProfileEntry
  tx: Tx
  theme: ThemeConfig
}

/** One list entry: first non-empty field as a title, the rest as secondary lines. */
export function EntryLines({ section, fields, entry, tx, theme }: EntryProps) {
  const { t } = useTranslation()
  // The first scalar field with a value is the entry's title.
  const titleKey = fields.find(f => f.field_type !== 'text_list' && fieldText(section, f, entry, t, tx) !== null)?.field_key
  return (
    <>
      {fields.map(field => {
        if (field.field_type === 'text_list') {
          const items = fieldListItems(section, field, entry, tx)
          return items.length ? (
            <ul key={field.field_key} className="text-xs text-slate-600 mt-1 space-y-0.5 dark:text-slate-300">
              {items.map((item, i) => <li key={i}>{theme.listBullet || '• '}{item}</li>)}
            </ul>
          ) : null
        }
        const text = fieldText(section, field, entry, t, tx)
        if (text === null) return null
        if (field.field_key === titleKey) {
          return <p key={field.field_key} className="text-sm font-semibold text-slate-900 dark:text-slate-50">{text}</p>
        }
        if (field.field_type === 'phone') {
          return (
            <a key={field.field_key} href={`tel:${text}`} className="block text-xs text-slate-700 underline mt-0.5 dark:text-slate-200" dir="ltr">
              {text}
            </a>
          )
        }
        return (
          <p
            key={field.field_key}
            className={cx(
              'text-xs text-slate-600 mt-1 leading-relaxed dark:text-slate-300',
              field.field_type === 'longtext' && `whitespace-pre-wrap ps-3 border-s-2 ${theme.deEscBorder}`,
            )}
          >
            {text}
          </p>
        )
      })}
    </>
  )
}

function SingleEntryBody({ section, fields, entry, tx, theme }: EntryProps) {
  const { t } = useTranslation()
  type Row = { field: SharedField; items: string[] | null; text: string | null }
  const rows: Row[] = fields.flatMap((field): Row[] => {
    if (field.field_type === 'text_list') {
      const items = fieldListItems(section, field, entry, tx)
      return items.length ? [{ field, items, text: null }] : []
    }
    const text = fieldText(section, field, entry, t, tx)
    return text === null ? [] : [{ field, items: null, text }]
  })

  // A section that is just one free-text field (e.g. behavioral notes): show the text alone.
  if (fields.length === 1 && rows.length === 1 && rows[0].text !== null) {
    return <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed dark:text-slate-200">{rows[0].text}</p>
  }

  return (
    <dl className="space-y-2">
      {rows.map(({ field, items, text }) =>
        field.field_type === 'longtext' ? (
          <div key={field.field_key} className="pt-1">
            <dt className="sr-only">{t(field.label_key)}</dt>
            <dd className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed dark:text-slate-200">{text}</dd>
          </div>
        ) : (
          <div key={field.field_key} className={cx('flex gap-2 py-1.5 border-b last:border-0', theme.divider)}>
            <dt className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0 dark:text-slate-400">{t(field.label_key)}</dt>
            <dd className="text-sm text-slate-800 dark:text-slate-100">
              {items ? (
                <ul className="space-y-0.5">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
              ) : field.field_type === 'boolean' ? (
                '✓'
              ) : field.field_type === 'phone' && text ? (
                <a href={`tel:${text}`} className="underline" dir="ltr">{text}</a>
              ) : (
                text
              )}
            </dd>
          </div>
        ),
      )}
    </dl>
  )
}
