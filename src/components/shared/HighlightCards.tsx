import { useTranslation } from 'react-i18next'
import { isDisplayable } from '../../lib/fieldFormat'
import { cx } from '../../lib/cx'
import type { SharedProfileEntry, SharedSection } from '../../lib/types'
import { fieldText, talkToMeLines, type Tx } from './sharedModel'
import type { ThemeConfig } from './sharedThemes'

interface TriggersProps {
  section: SharedSection
  entries: SharedProfileEntry[]
  tx: Tx
  theme: ThemeConfig
}

/**
 * Above-the-fold "Triggers" card: the parent's top entries, each with its
 * first field as the headline and the remaining fields (e.g. how to
 * de-escalate) indented beneath.
 */
export function TriggersCard({ section, entries, tx, theme }: TriggersProps) {
  const { t } = useTranslation()
  const fields = section.fields.filter(isDisplayable)
  return (
    <section aria-label={t('sharedPage.triggers')} className={cx(theme.triggerCardBg, 'p-4')}>
      <h2 className={cx(theme.triggerHeading, 'mb-3')}>{t('sharedPage.triggers')}</h2>
      <ul className="space-y-3">
        {entries.map(entry => {
          const [first, ...rest] = fields
            .map(f => fieldText(section, f, entry, t, tx))
            .filter((v): v is string => v !== null)
          return (
            <li key={entry.id} className="text-sm">
              <span className={cx('font-semibold block', theme.triggerText)}>{theme.listBullet}{first}</span>
              {rest.map((line, i) => (
                <span key={i} className={cx('block mt-1 ps-3 border-s-2 text-xs leading-relaxed opacity-80', theme.deEscBorder)}>
                  {line}
                </span>
              ))}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface TalkProps {
  section: SharedSection
  entry: SharedProfileEntry
  /** field_key rendered as the identity badge instead of here (e.g. 'level'). */
  badgeFieldKey: string | null
  tx: Tx
  theme: ThemeConfig
}

/** Above-the-fold "Talk to me" card for the communication section. */
export function TalkToMeCard({ section, entry, badgeFieldKey, tx, theme }: TalkProps) {
  const { t } = useTranslation()
  const lines = talkToMeLines(section, entry, badgeFieldKey, t, tx)
  if (lines.length === 0) return null
  return (
    <section aria-label={t('sharedPage.talkToMe')} className={cx(theme.talkCardBg, 'p-4')}>
      <h2 className={cx(theme.talkHeading, 'mb-3')}>{t('sharedPage.talkToMe')}</h2>
      <ul className={cx('space-y-2 text-sm', theme.talkText)}>
        {lines.map((line, i) => (
          <li key={i} className="leading-snug">{theme.listBullet}{line}</li>
        ))}
      </ul>
    </section>
  )
}
