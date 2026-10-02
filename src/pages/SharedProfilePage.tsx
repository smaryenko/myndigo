import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { AlertBadge, AlertBar } from '../components/shared/AlertBar'
import { ContactRows } from '../components/shared/ContactRows'
import { ExpandableSection } from '../components/shared/ExpandableSection'
import { TalkToMeCard, TriggersCard } from '../components/shared/HighlightCards'
import { CommunicationBadge, IdentityCard, type CommunicationLevel } from '../components/shared/IdentityCard'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguagePicker } from '../components/shared/LanguagePicker'
import { SectionBody } from '../components/shared/SectionBody'
import {
  buildSectionViews,
  groupSections,
  sectionTitle,
  sortAlerts,
  talkToMeLines,
  type SectionView,
} from '../components/shared/sharedModel'
import { resolveTheme } from '../components/shared/sharedThemes'
import { useSharedProfile } from '../components/shared/useSharedProfile'

// Sections with a dedicated above-the-fold layout. Everything else —
// including any section added to section_definitions later — is rendered
// generically below the fold from its field definitions.
const TRIGGERS_KEY = 'triggers'
const COMMUNICATION_KEY = 'communication'
/** How many triggers / alerts fit above the fold before the rest are collapsed. */
const TOP_COUNT = 3

/**
 * Public read-only profile (/s/:token). Designed for a stranger — a first
 * responder, teacher or caregiver — scanning a QR code or NFC tag: the most
 * urgent information first, everything else one tap away.
 *
 * Above the fold: language, alerts, identity (+ communication level),
 * emergency contacts, triggers + "talk to me". Below: every other section.
 */
export function SharedProfilePage() {
  const { token } = useParams<{ token: string }>()
  const { t } = useTranslation()
  const { status, profile, viewerLang, translating, changeLanguage, tx } = useSharedProfile(token)

  if (status === 'loading') return <LoadingSpinner variant="fullPage" />

  if (status === 'notFound' || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
        <ThemeToggle className="fixed top-4 end-4" />
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4" aria-hidden="true">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('sharedPage.notShared')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sharedPage.notSharedHint')}</p>
        <footer className="fixed bottom-4 text-xs text-slate-300 dark:text-slate-600">{t('common.poweredBy')}</footer>
      </main>
    )
  }

  const theme = resolveTheme(profile.child.share_theme)
  const views = buildSectionViews(profile, t)

  const alertView = views.find(v => v.section.render_hint === 'alert_bar')
  const contactView = views.find(v => v.section.render_hint === 'contact_list')
  const triggersView = views.find(v => v.section.section_key === TRIGGERS_KEY)
  const commView = views.find(v => v.section.section_key === COMMUNICATION_KEY)

  const alerts = alertView ? sortAlerts(alertView.entries) : []

  // Communication level → identity badge: the section's first select field.
  const commEntry = commView?.entries[0] ?? null
  const levelField = commView?.section.fields.find(f => f.field_type === 'select') ?? null
  const levelValue = commEntry && levelField ? commEntry.values[levelField.field_key] : null
  const levelOption = levelField?.options?.find(o => o.value === levelValue)
  const level: CommunicationLevel | null = levelOption ? { value: levelOption.value, label: t(levelOption.label_key) } : null

  const hasTalkToMe = !!(commView && commEntry && talkToMeLines(commView.section, commEntry, levelField?.field_key ?? null, t, tx).length)
  const topTriggers = triggersView?.entries.slice(0, TOP_COUNT) ?? []

  // Below the fold: everything without a dedicated layout, plus the full
  // trigger list when it didn't all fit above.
  const featured = new Set([alertView, contactView, triggersView, commView])
  const belowFold: SectionView[] = views.filter(v => !featured.has(v))
  const blocks = groupSections(belowFold)

  return (
    // Full-width wrapper so the theme background also fills the sides on wide screens.
    // Neutral full-width backdrop; the content column keeps the theme colour and
    // gets a subtle outline + shadow on wider screens so it reads as a card.
    <div className="min-h-screen bg-white dark:bg-black">
    <div className={cx(
      'min-h-screen max-w-lg mx-auto flex flex-col font-sans text-slate-900 dark:text-slate-100',
      'sm:border-x sm:border-slate-200 sm:shadow-xl dark:sm:border-white/10 dark:sm:shadow-black/60',
      theme.pageBg,
    )}>
      <div className="flex justify-end items-center gap-2 px-4 pt-1.5">
        <LanguagePicker value={viewerLang} onChange={changeLanguage} translating={translating} theme={theme} />
        <ThemeToggle className="w-8 h-8" />
      </div>

      <main className="flex-1 flex flex-col">
        {alertView && <AlertBar section={alertView.section} alerts={alerts} tx={tx} theme={theme} limit={TOP_COUNT} />}

        {profile.personalInfo ? (
          <IdentityCard personalInfo={profile.personalInfo} level={level} theme={theme} />
        ) : (
          level && (
            <div className="mx-4 mb-3">
              <CommunicationBadge level={level} theme={theme} />
            </div>
          )
        )}

        {contactView && <ContactRows section={contactView.section} contacts={contactView.entries} tx={tx} theme={theme} />}

        {(topTriggers.length > 0 || hasTalkToMe) && (
          <div className="mx-4 grid grid-cols-2 gap-2 mb-2">
            {triggersView && topTriggers.length > 0 && (
              <TriggersCard section={triggersView.section} entries={topTriggers} tx={tx} theme={theme} />
            )}
            {commView && commEntry && hasTalkToMe && (
              <TalkToMeCard section={commView.section} entry={commEntry} badgeFieldKey={levelField?.field_key ?? null} tx={tx} theme={theme} />
            )}
          </div>
        )}

        <div className="flex-1 mx-4 mb-2">
          {alertView && alerts.length > TOP_COUNT && (
            <ExpandableSection theme={theme} title={`${t('sharedPage.alerts')} (${alerts.length})`}>
              <div className="flex flex-wrap gap-2">
                {alerts.map(alert => (
                  <AlertBadge key={alert.id} section={alertView.section} alert={alert} tx={tx} theme={theme} />
                ))}
              </div>
            </ExpandableSection>
          )}

          {triggersView && triggersView.entries.length > TOP_COUNT && (
            <ExpandableSection theme={theme} title={sectionTitle(triggersView.section, t)}>
              <SectionBody section={triggersView.section} entries={triggersView.entries} tx={tx} theme={theme} />
            </ExpandableSection>
          )}

          {blocks.map(block =>
            block.kind === 'single' ? (
              <ExpandableSection key={block.view.section.section_key} theme={theme} title={sectionTitle(block.view.section, t)}>
                <SectionBody section={block.view.section} entries={block.view.entries} tx={tx} theme={theme} />
              </ExpandableSection>
            ) : (
              <ExpandableSection key={block.labelKey} theme={theme} title={t(block.labelKey)}>
                <div className="space-y-4">
                  {block.views.map(view => (
                    <div key={view.section.section_key}>
                      <h3 className={cx(theme.sectionHeading, 'mb-2')}>{sectionTitle(view.section, t)}</h3>
                      <SectionBody section={view.section} entries={view.entries} tx={tx} theme={theme} />
                    </div>
                  ))}
                </div>
              </ExpandableSection>
            ),
          )}
        </div>
      </main>

      <footer className={cx('fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg text-center py-3 text-xs font-medium z-10', theme.footerText, theme.footer)}>
        {t('common.poweredBy')}
      </footer>
      <div className="h-10" aria-hidden="true" />
    </div>
    </div>
  )
}
