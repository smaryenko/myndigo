import { useTranslation } from 'react-i18next'
import { contactFieldRoles } from '../../lib/fieldFormat'
import { cx } from '../../lib/cx'
import type { SharedProfileEntry, SharedSection } from '../../lib/types'
import { ExpandableSection } from './ExpandableSection'
import { fieldText, sectionTitle, type Tx } from './sharedModel'
import type { ThemeConfig } from './sharedThemes'

interface Props {
  section: SharedSection
  contacts: SharedProfileEntry[]
  tx: Tx
  theme: ThemeConfig
  /** How many contacts get large tap-to-call rows; the rest go in an expandable list. */
  primaryCount?: number
}

/**
 * Emergency contacts: the first `primaryCount` (in the parent's priority
 * order) as large tap-to-call rows, the rest directly below in an
 * expandable list. Field roles come from field types (see contactFieldRoles).
 */
export function ContactRows({ section, contacts, tx, theme, primaryCount = 2 }: Props) {
  const { t } = useTranslation()
  const { nameField, phoneField, detailFields } = contactFieldRoles(section.fields)
  if (contacts.length === 0) return null

  const describe = (contact: SharedProfileEntry) => ({
    name: nameField ? fieldText(section, nameField, contact, t, tx) ?? '' : '',
    phone: phoneField ? fieldText(section, phoneField, contact, t, tx) : null,
    details: detailFields
      .map(f => fieldText(section, f, contact, t, tx))
      .filter((d): d is string => d !== null),
  })

  const primary = contacts.slice(0, primaryCount)
  const more = contacts.slice(primaryCount)

  return (
    <div className="mx-4 mb-2">
      <ul className="space-y-2" aria-label={t(section.label_key)}>
        {primary.map(contact => {
          const { name, phone, details } = describe(contact)
          const body = (
            <>
              <div className={cx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', theme.contactIcon)} aria-hidden="true">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 leading-tight dark:text-slate-50">{name}</p>
                {details.map(d => <p key={d} className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{d}</p>)}
              </div>
              {phone && <span className={cx('font-bold text-base tabular-nums', theme.contactPhone)} dir="ltr">{phone}</span>}
            </>
          )
          const rowClass = cx('flex items-center gap-4 px-4 py-3.5 transition-colors', theme.contactRow)
          return (
            <li key={contact.id}>
              {phone ? (
                <a href={`tel:${phone}`} className={rowClass} aria-label={`${t('sharedPage.callNow')} ${name} ${phone}`}>
                  {body}
                </a>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>

      {more.length > 0 && (
        <div className="mt-2">
          <ExpandableSection theme={theme} title={`${sectionTitle(section, t)} (${more.length})`}>
            <ul className="space-y-2">
              {more.map(contact => {
                const { name, phone, details } = describe(contact)
                return (
                  <li key={contact.id} className={cx('flex items-center gap-3 py-2 border-b last:border-0', theme.divider)}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{name}</p>
                      {details.map(d => <p key={d} className="text-xs text-slate-500 dark:text-slate-400">{d}</p>)}
                    </div>
                    {phone && (
                      <a href={`tel:${phone}`} className="text-slate-900 font-semibold text-sm tabular-nums underline dark:text-slate-50" dir="ltr">
                        {phone}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </ExpandableSection>
        </div>
      )}
    </div>
  )
}
