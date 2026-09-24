import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSharedProfile } from '../lib/db'
import { loadLanguage } from '../lib/i18n'
import type { SharedProfile, SharedProfileEntry } from '../lib/types'
import { ALERT_DISPLAY } from '../lib/types'
import { SUPPORTED_LANGS } from '../lib/languages'
import { type BuiltInTheme } from '../lib/themes'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

// Module-level (not a hook) so it has no dependency on component state or
// declaration order — it's called both from the initial-load effect (for
// the child's default share_language) and from the language switcher.
async function fetchFieldTranslations(childId: string, lang: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ child_id: childId, target_lang: lang }),
      }
    )
    const data = await res.json()
    return data?.translations ?? {}
  } catch (err) {
    console.error('[translate] failed:', err)
    return {}
  }
}

// ── Theme config ──────────────────────────────────────────────────────────────
// Each theme is a set of Tailwind class strings consumed throughout the page.
// professional — current look: slate/white, clinical, tight
// warm         — softer middle ground: amber tints, rounder cards, gentle shadows
// playful      — cheerful and childish: matches the landing page mock preview

interface ThemeConfig {
  /** Page background */
  pageBg: string
  /** Font family class */
  font: string
  /** Standard card (identity block, expandable sections) */
  card: string
  /** Wider / grid cell card (triggers, talk-to-me) */
  cardGrid: string
  /** Background + text colour of the triggers grid card */
  triggerCardBg: string
  triggerHeading: string
  triggerText: string
  /** Background + text colour of the talk-to-me grid card */
  talkCardBg: string
  talkHeading: string
  talkText: string
  /** Emergency contact row */
  contactRow: string
  /** Footer bar */
  footer: string
  /** Footer text colour */
  footerText: string
  /** Language picker button */
  langBtn: string
  /** Section heading inside cards (TRIGGERS / TALK TO ME etc.) */
  sectionHeading: string
  /** Inline divider between items */
  divider: string
  /** De-escalation indent border */
  deEscBorder: string
  /** Alert bar wrapper */
  alertBar: string
  /** Alert bar heading text */
  alertHeading: string
  /** Alert badge — red severity */
  alertBadgeRed: string
  /** Alert badge — orange severity */
  alertBadgeOrange: string
  /** Contact icon circle */
  contactIcon: string
  /** Contact phone number text colour */
  contactPhone: string
  /** Photo placeholder bg */
  photoPlaceholder: string
  /** Photo / avatar border radius */
  photoRadius: string
  /** Communication level badge shape */
  commBadgeRadius: string
  /** Bullet character for list items ('' = no bullet) */
  listBullet: string
}

// Keyed by BuiltInTheme (not the wider ShareTheme) so removing/renaming a
// theme in themes.ts causes a compile error here — the fallback lookup at
// the call site below still handles any legacy/unknown value gracefully.
const THEMES: Record<BuiltInTheme, ThemeConfig> = {
  professional: {
    pageBg:           'bg-slate-200',
    font:             'font-sans',
    card:             'bg-white rounded-lg border border-slate-300',
    cardGrid:         'bg-white rounded-xl border border-slate-300',
    triggerCardBg:    'bg-white rounded-xl border border-slate-300',
    triggerHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest',
    triggerText:      'text-slate-900',
    talkCardBg:       'bg-white rounded-xl border border-slate-300',
    talkHeading:      'text-xs font-bold text-slate-600 uppercase tracking-widest',
    talkText:         'text-slate-800',
    contactRow:       'bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:bg-slate-100',
    footer:           'bg-slate-200 border-t border-slate-300',
    footerText:       'text-slate-500',
    langBtn:          'border border-slate-300 bg-white hover:bg-slate-50',
    sectionHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest',
    divider:          'border-slate-100',
    deEscBorder:      'border-slate-300',
    alertBar:         'bg-red-700 rounded-xl',
    alertHeading:     'text-red-200',
    alertBadgeRed:    'bg-red-800 text-red-100',
    alertBadgeOrange: 'bg-amber-700 text-white',
    contactIcon:      'bg-green-50 border border-green-200',
    contactPhone:     'text-slate-900',
    photoPlaceholder: 'bg-slate-100',
    photoRadius:      'rounded-lg',
    commBadgeRadius:  'rounded-md',
    listBullet:       '',
  },
  warm: {
    pageBg:           'bg-orange-50',
    font:             'font-sans',
    card:             'bg-white rounded-2xl border border-orange-100 shadow-sm',
    cardGrid:         'bg-white rounded-2xl border border-orange-100 shadow-sm',
    triggerCardBg:    'bg-red-50 rounded-2xl border border-red-100',
    triggerHeading:   'text-xs font-bold text-red-600 uppercase tracking-widest',
    triggerText:      'text-red-900',
    talkCardBg:       'bg-blue-50 rounded-2xl border border-blue-100',
    talkHeading:      'text-xs font-bold text-blue-600 uppercase tracking-widest',
    talkText:         'text-blue-900',
    contactRow:       'bg-green-50 border border-green-200 rounded-2xl shadow-sm hover:bg-green-100 active:bg-green-100',
    footer:           'bg-orange-50 border-t border-orange-200',
    footerText:       'text-orange-700',
    langBtn:          'border border-orange-200 bg-white hover:bg-orange-50',
    sectionHeading:   'text-xs font-semibold text-orange-700 uppercase tracking-widest',
    divider:          'border-orange-100',
    deEscBorder:      'border-orange-300',
    alertBar:         'bg-red-50 rounded-2xl border border-red-200',
    alertHeading:     'text-red-700',
    alertBadgeRed:    'bg-red-100 border border-red-300 text-red-800',
    alertBadgeOrange: 'bg-orange-100 border border-orange-300 text-orange-800',
    contactIcon:      'bg-green-100 border border-green-300',
    contactPhone:     'text-green-700',
    photoPlaceholder: 'bg-orange-100',
    photoRadius:      'rounded-2xl',
    commBadgeRadius:  'rounded-full',
    listBullet:       '• ',
  },
  playful: {
    pageBg:           'bg-violet-100',
    font:             'font-sans',
    card:             'bg-white rounded-3xl border-2 border-violet-200 shadow-md',
    cardGrid:         'bg-white rounded-3xl border-2 border-violet-200 shadow-md',
    triggerCardBg:    'bg-red-50 rounded-3xl border-2 border-red-200',
    triggerHeading:   'text-xs font-bold text-red-600 uppercase tracking-widest',
    triggerText:      'text-red-900',
    talkCardBg:       'bg-sky-50 rounded-3xl border-2 border-sky-200',
    talkHeading:      'text-xs font-bold text-sky-600 uppercase tracking-widest',
    talkText:         'text-sky-900',
    contactRow:       'bg-green-50 border-2 border-green-200 rounded-3xl shadow-md hover:bg-green-100 active:bg-green-100',
    footer:           'bg-violet-100 border-t border-violet-300',
    footerText:       'text-violet-600',
    langBtn:          'border border-violet-300 bg-white hover:bg-violet-50',
    sectionHeading:   'text-xs font-bold text-violet-600 uppercase tracking-widest',
    divider:          'border-violet-100',
    deEscBorder:      'border-violet-300',
    alertBar:         'bg-red-50 rounded-3xl border-2 border-red-200',
    alertHeading:     'text-red-700',
    alertBadgeRed:    'bg-red-100 border-2 border-red-300 text-red-800',
    alertBadgeOrange: 'bg-orange-100 border-2 border-orange-300 text-orange-800',
    contactIcon:      'bg-green-100 border-2 border-green-300',
    contactPhone:     'text-green-700',
    photoPlaceholder: 'bg-violet-100',
    photoRadius:      'rounded-3xl',
    commBadgeRadius:  'rounded-full',
    listBullet:       '• ',
  },
}

// ── Expandable section wrapper ────────────────────────────────────────────────
function ExpandableSection({
  title, children, theme,
}: {
  title: string
  children: React.ReactNode
  theme: ThemeConfig
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${theme.card} mb-1.5 overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className={`px-4 pb-4 border-t ${theme.divider} pt-3`}>{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function SharedProfilePage() {
  const { token } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation()

  const [profile, setProfile] = useState<SharedProfile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewerLang, setViewerLang] = useState('en')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const loggedRef = useRef(false)

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const logView = (childId: string) => {
      const ua = navigator.userAgent
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-share-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ child_id: childId, user_agent: ua, geo_source: null }),
      }).catch(err => console.error('[log-share-view] fetch failed:', err))

      if ('geolocation' in navigator) {
        navigator.permissions?.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            navigator.geolocation.getCurrentPosition(pos => {
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-share-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
                body: JSON.stringify({ child_id: childId, user_agent: ua, latitude: pos.coords.latitude, longitude: pos.coords.longitude, geo_source: 'browser' }),
              })
            })
          }
        }).catch(() => {})
      }
    }

    getSharedProfile(token)
      .then(async profile => {
        if (!profile) { setNotFound(true); setLoading(false); return }

        const defaultLang = profile.child.share_language ?? 'en'
        setViewerLang(defaultLang)
        await loadLanguage(defaultLang)
        i18n.changeLanguage(defaultLang)

        setProfile(profile)

        if (!loggedRef.current) {
          loggedRef.current = true
          logView(profile.child.id)
        }
        setLoading(false)

        // Field values (parent-entered content) are translated separately
        // from UI strings — i18n.changeLanguage above only swaps UI copy.
        // Previously this fetch only ran when the viewer manually switched
        // languages via the picker, so a child whose share_language is
        // already non-English (the common case — parents set this to their
        // own language) rendered with untranslated English field values on
        // first load. Skip the call entirely for English since there's
        // nothing to translate.
        if (defaultLang !== 'en') {
          setTranslating(true)
          fetchFieldTranslations(profile.child.id, defaultLang)
            .then(setTranslations)
            .finally(() => setTranslating(false))
        }
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  const handleViewerLangChange = useCallback(async (lang: string) => {
    setViewerLang(lang)
    await loadLanguage(lang)
    i18n.changeLanguage(lang)
    if (!profile) return
    if (lang === 'en') {
      // Nothing to translate for English — clear any translations left
      // over from a previous non-English selection so tx() falls back
      // to the original (English) field values.
      setTranslations({})
      return
    }
    setTranslating(true)
    try {
      const translations = await fetchFieldTranslations(profile.child.id, lang)
      setTranslations(translations)
    } finally {
      setTranslating(false)
    }
  }, [i18n, profile])

  const tx = (fieldPath: string, original: string) =>
    translations[fieldPath] ?? original

  // ── Render: loading ─────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingSpinner fullPage />
  }

  // ── Render: not found ───────────────────────────────────────────────────────
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-800 mb-1">{t('sharedPage.notShared')}</h1>
        <p className="text-sm text-slate-500">{t('sharedPage.notSharedHint')}</p>
        <footer className="fixed bottom-4 text-xs text-slate-300">{t('common.poweredBy')}</footer>
      </div>
    )
  }

  // ── Resolve theme ───────────────────────────────────────────────────────────
  const theme = THEMES[(profile.child.share_theme as BuiltInTheme) ?? 'professional'] ?? THEMES.professional

  const { personalInfo, entries } = profile

  // Pull each section's entries out of the flat `entries` array. Filtering by
  // section_key here (rather than one array per section) is the only change
  // from the old per-table shape — visual structure below is unchanged.
  const byKey = (key: string) => entries.filter(e => e.section_key === key)

  const alerts = byKey('alerts')
  const communicationEntry = byKey('communication')[0] ?? null
  const triggers = byKey('triggers')
  const sensorySensitivities = byKey('sensory')
  const routines = byKey('routines')
  const medications = byKey('medications')
  const medicalConditions = byKey('conditions')
  const doctors = byKey('doctors')
  const contacts = [...byKey('contacts')].sort((a, b) => a.sort_order - b.sort_order)
  const behavioralNotesEntry = byKey('behavioral_notes')[0] ?? null
  const educationEntry = byKey('education')[0] ?? null

  const communication = communicationEntry ? {
    section_visible: communicationEntry.section_visible,
    level: communicationEntry.values.level as string | undefined,
    uses_aac: Boolean(communicationEntry.values.uses_aac),
    aac_device: communicationEntry.values.aac_device as string | null,
    echolalia: Boolean(communicationEntry.values.echolalia),
    instructions: (communicationEntry.values.instructions as string[] | undefined) ?? [],
  } : null

  const topTriggers = triggers.filter(e => e.section_visible).slice(0, 3)
  const topContacts = contacts.filter(c => c.section_visible).slice(0, 2)
  const moreContacts = contacts.filter(c => c.section_visible).slice(2)
  const visibleAlerts = alerts.filter(a => a.section_visible)
    .sort((a, b) => (a.values.severity === 'red' ? -1 : 1) - (b.values.severity === 'red' ? -1 : 1))

  const now = new Date()
  const age = personalInfo?.date_of_birth
    ? Math.floor((now.getTime() - new Date(personalInfo.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className={`min-h-screen ${theme.pageBg} max-w-lg mx-auto flex flex-col ${theme.font}`}>

      {/* ── Language switcher ─────────────────────────────────────────────── */}
      <div className="flex justify-end px-4 pt-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangPicker(l => !l)}
            className={`flex items-center gap-1.5 text-xs text-slate-500 rounded-md px-2.5 py-1.5 ${theme.langBtn}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            {SUPPORTED_LANGS.find(l => l.code === viewerLang)?.label ?? t('common.appName')}
            {translating && <span className="ml-1 w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />}
          </button>
          {showLangPicker && (
            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 w-44 text-sm">
              {SUPPORTED_LANGS.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    handleViewerLangChange(lang.code)
                    setShowLangPicker(false)
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${
                    viewerLang === lang.code ? 'text-slate-900 font-medium' : 'text-slate-600'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ───────────────────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className={`mx-4 mt-2 mb-2 ${theme.alertBar} px-4 py-3.5`}>
          <p className={`text-xs font-semibold ${theme.alertHeading} uppercase tracking-widest mb-2.5`}>
            ⚠️ {t('sharedPage.alerts')}
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleAlerts.slice(0, 3).map(alert => (
              <AlertBadge key={alert.id} alert={alert} translations={translations} theme={theme} />
            ))}
            {visibleAlerts.length > 3 && (
              <span className={`text-xs ${theme.alertHeading} self-center`}>
                {t('sharedPage.moreAlerts', { count: visibleAlerts.length - 3 })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── IDENTITY ─────────────────────────────────────────────────────── */}
      {personalInfo?.section_visible && (
        <div className={`mx-4 ${theme.card} px-4 py-4 flex items-center gap-4 mb-2`}>
          {personalInfo.photo_base64 && personalInfo.photo_visible !== false ? (
            <>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className={`w-20 h-20 ${theme.photoRadius} overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-400 select-none`}
                aria-label="View full photo"
                onContextMenu={e => e.preventDefault()}
              >
                <img src={personalInfo.photo_base64} alt={personalInfo.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
              </button>
              {lightboxOpen && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none"
                  aria-label="Close photo"
                  onContextMenu={e => e.preventDefault()}
                >
                  <img src={personalInfo.photo_base64} alt={personalInfo.name} className="max-w-full max-h-full rounded-lg object-contain shadow-2xl pointer-events-none" draggable={false} />
                </button>
              )}
            </>
          ) : (
            <div className={`w-20 h-20 ${theme.photoRadius} ${theme.photoPlaceholder} flex items-center justify-center flex-shrink-0`}>
              <svg className="w-10 h-10 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {personalInfo.name}{age !== null ? <span className="font-normal text-slate-500">, {age}</span> : ''}
            </h1>
            {personalInfo.pronouns && (
              <p className="text-sm text-slate-600 mt-0.5">
                <span className="font-medium text-slate-800">{t('child.personalInfo.pronouns')}:</span> {personalInfo.pronouns}
              </p>
            )}
            {communication?.section_visible && communication.level && (
              <span className={`mt-2 inline-block text-xs font-bold px-2.5 py-1 ${theme.commBadgeRadius} ${
                communication.level === 'non_verbal'
                  ? 'bg-red-100 text-red-700'
                  : communication.level === 'limited_verbal'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {t(`sharedPage.communicationLevels.${communication.level}`)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Communication level badge — shown when personalInfo is hidden */}
      {!personalInfo?.section_visible && communication?.section_visible && communication.level && (
        <div className="mx-4 mb-3">
          <span className={`inline-block text-xs font-bold px-2.5 py-1 ${theme.commBadgeRadius} ${
            communication.level === 'non_verbal'
              ? 'bg-red-100 text-red-700'
              : communication.level === 'limited_verbal'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {t(`sharedPage.communicationLevels.${communication.level}`)}
          </span>
        </div>
      )}

      {/* ── EMERGENCY CONTACTS ───────────────────────────────────────────── */}
      {topContacts.length > 0 && (
        <div className="mx-4 space-y-2 mb-2">
          {topContacts.map(contact => (
            <a
              key={contact.id}
              href={`tel:${contact.values.phone as string}`}
              className={`flex items-center gap-4 ${theme.contactRow} px-4 py-3.5 transition-colors`}
            >
              <div className={`w-9 h-9 rounded-full ${theme.contactIcon} flex items-center justify-center flex-shrink-0`}>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 leading-tight">{tx(`contacts.${contact.id}.name`, contact.values.name as string)}</p>
                {contact.values.relation ? <p className="text-xs text-slate-500 mt-0.5">{tx(`contacts.${contact.id}.relation`, contact.values.relation as string)}</p> : null}
              </div>
              <span className={`${theme.contactPhone} font-bold text-base tabular-nums`}>{contact.values.phone as string}</span>
            </a>
          ))}
          {moreContacts.length > 0 && (
            <p className="text-xs text-slate-400 text-center">{t('sharedPage.moreContacts', { count: moreContacts.length })}</p>
          )}
        </div>
      )}

      {/* ── TRIGGERS + COMMUNICATION ─────────────────────────────────────── */}
      {(topTriggers.length > 0 || (communication?.uses_aac || communication?.echolalia || (communication?.instructions?.length ?? 0) > 0)) && (
        <div className="mx-4 grid grid-cols-2 gap-2 mb-2">
          {topTriggers.length > 0 && (
            <div className={`${theme.triggerCardBg} p-4`}>
              <p className={`${theme.triggerHeading} mb-3`}>{t('sharedPage.triggers')}</p>
              <ul className="space-y-3">
                {topTriggers.map(trigger => (
                  <li key={trigger.id} className="text-sm">
                    <span className={`font-semibold ${theme.triggerText} block`}>{theme.listBullet}{tx(`triggers.${trigger.id}.trigger_text`, trigger.values.trigger_text as string)}</span>
                    {trigger.values.de_escalation ? (
                      <span className={`block mt-1 pl-3 border-l-2 ${theme.deEscBorder} text-xs leading-relaxed opacity-80`}>
                        {tx(`triggers.${trigger.id}.de_escalation`, trigger.values.de_escalation as string)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {communication?.section_visible && (communication.uses_aac || communication.echolalia || (communication.instructions?.length ?? 0) > 0) && (
            <div className={`${theme.talkCardBg} p-4`}>
              <p className={`${theme.talkHeading} mb-3`}>{t('sharedPage.talkToMe')}</p>
              <ul className={`space-y-2 text-sm ${theme.talkText}`}>
                {communication.uses_aac && (
                  <li className="leading-snug">{theme.listBullet}{communication.aac_device
                    ? t('sharedPage.usesAacDevice', { device: tx('communication.aac_device', communication.aac_device) })
                    : t('sharedPage.usesAac')}
                  </li>
                )}
                {communication.echolalia && <li className="leading-snug">{theme.listBullet}{t('sharedPage.echolalia')}</li>}
                {communication.instructions.slice(0, 3).map((instr, i) => (
                  <li key={i} className="leading-snug">{theme.listBullet}{tx(`communication.instructions.${i}`, instr)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── EXPANDABLE SECTIONS ──────────────────────────────────────────── */}
      <div className="flex-1 mx-4 mb-2">

        {visibleAlerts.length > 3 && (
          <ExpandableSection theme={theme} title={`${t('sharedPage.alerts')} (${visibleAlerts.length})`}>
            <div className="flex flex-wrap gap-2">
              {visibleAlerts.map(alert => (
                <AlertBadge key={alert.id} alert={alert} translations={translations} theme={theme} />
              ))}
            </div>
          </ExpandableSection>
        )}

        {triggers.filter(e => e.section_visible).length > 3 && (
          <ExpandableSection theme={theme} title={t('sharedPage.sections.allTriggers')}>
            <div className="space-y-3">
              {triggers.filter(e => e.section_visible).map(trigger => (
                <div key={trigger.id} className={`py-2 border-b ${theme.divider} last:border-0`}>
                  <p className="text-sm font-medium text-slate-800">{tx(`triggers.${trigger.id}.trigger_text`, trigger.values.trigger_text as string)}</p>
                  {trigger.values.de_escalation ? (
                    <p className={`text-xs text-slate-500 mt-1 pl-3 border-l-2 ${theme.deEscBorder}`}>{tx(`triggers.${trigger.id}.de_escalation`, trigger.values.de_escalation as string)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {sensorySensitivities.filter(e => e.section_visible).length > 0 && (
          <ExpandableSection theme={theme} title={t('sharedPage.sensorySections.title')}>
            <div className="space-y-1">
              {sensorySensitivities.filter(e => e.section_visible).map(item => (
                <div key={item.id} className={`py-2.5 border-b ${theme.divider} last:border-0`}>
                  <p className="text-sm font-semibold text-slate-900">{t(`sharedPage.sensorySections.${item.values.sensory_type as string}`)}</p>
                  {item.values.note ? <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{tx(`sensory.${item.id}.note`, item.values.note as string)}</p> : null}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {routines.filter(e => e.section_visible).length > 0 && (
          <ExpandableSection theme={theme} title={t('sharedPage.sections.routines')}>
            <div className="space-y-2">
              {routines.filter(e => e.section_visible).map(routine => (
                <div key={routine.id} className={`py-2 border-b ${theme.divider} last:border-0`}>
                  <p className="text-sm font-medium text-slate-800">{tx(`routines.${routine.id}.description`, routine.values.description as string)}</p>
                  {routine.values.disruption_note ? (
                    <p className="text-xs text-slate-500 mt-1">{tx(`routines.${routine.id}.disruption_note`, routine.values.disruption_note as string)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {(medications.some(e => e.section_visible) || medicalConditions.some(e => e.section_visible) || doctors.some(e => e.section_visible)) && (
          <ExpandableSection theme={theme} title={t('sharedPage.sections.medical')}>
            <div className="space-y-4">
              {medications.filter(e => e.section_visible).length > 0 && (
                <div>
                  <p className={`${theme.sectionHeading} mb-2`}>{t('sharedPage.sections.medications')}</p>
                  {medications.filter(e => e.section_visible).map(med => (
                    <div key={med.id} className={`py-2 border-b ${theme.divider} last:border-0`}>
                      <p className="text-sm font-medium text-slate-800">{med.values.name as string}</p>
                      {(med.values.dose || med.values.frequency) && <p className="text-xs text-slate-500">{[med.values.dose, med.values.frequency].filter(Boolean).join(' · ')}</p>}
                      {med.values.note ? <p className="text-xs text-slate-400 mt-0.5">{med.values.note as string}</p> : null}
                    </div>
                  ))}
                </div>
              )}
              {medicalConditions.filter(e => e.section_visible).length > 0 && (
                <div>
                  <p className={`${theme.sectionHeading} mb-2`}>{t('sharedPage.sections.conditions')}</p>
                  {medicalConditions.filter(e => e.section_visible).map(cond => (
                    <div key={cond.id} className={`py-2 border-b ${theme.divider} last:border-0`}>
                      <p className="text-sm font-medium text-slate-800">{cond.values.name as string}</p>
                      {cond.values.note ? <p className="text-xs text-slate-500 mt-0.5">{cond.values.note as string}</p> : null}
                    </div>
                  ))}
                </div>
              )}
              {doctors.filter(e => e.section_visible).length > 0 && (
                <div>
                  <p className={`${theme.sectionHeading} mb-2`}>{t('sharedPage.sections.doctors')}</p>
                  {doctors.filter(e => e.section_visible).map(doc => (
                    <div key={doc.id} className={`py-2 border-b ${theme.divider} last:border-0`}>
                      <p className="text-sm font-medium text-slate-800">{doc.values.name as string}</p>
                      {doc.values.specialty ? <p className="text-xs text-slate-500">{doc.values.specialty as string}</p> : null}
                      {doc.values.phone ? <a href={`tel:${doc.values.phone}`} className="text-xs text-slate-700 underline">{doc.values.phone as string}</a> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ExpandableSection>
        )}

        {moreContacts.length > 0 && (
          <ExpandableSection theme={theme} title={t('sharedPage.sections.moreContacts')}>
            <div className="space-y-2">
              {moreContacts.map(contact => (
                <a key={contact.id} href={`tel:${contact.values.phone as string}`} className={`flex items-center gap-3 py-2 border-b ${theme.divider} last:border-0`}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{tx(`contacts.${contact.id}.name`, contact.values.name as string)}</p>
                    {contact.values.relation ? <p className="text-xs text-slate-500">{tx(`contacts.${contact.id}.relation`, contact.values.relation as string)}</p> : null}
                  </div>
                  <span className="text-slate-900 font-semibold text-sm tabular-nums">{contact.values.phone as string}</span>
                </a>
              ))}
            </div>
          </ExpandableSection>
        )}

        {behavioralNotesEntry?.section_visible && behavioralNotesEntry.values.content ? (
          <ExpandableSection theme={theme} title={t('sharedPage.sections.behavioral')}>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {tx('behavioral_notes.content', behavioralNotesEntry.values.content as string)}
            </p>
          </ExpandableSection>
        ) : null}

        {educationEntry?.section_visible && (
          educationEntry.values.school_name ||
          educationEntry.values.class_grade ||
          educationEntry.values.teacher_name ||
          educationEntry.values.support_worker ||
          educationEntry.values.notes
        ) && (
          <ExpandableSection theme={theme} title={t('child.sections.educationalInfo')}>
            <div className="space-y-2">
              {educationEntry.values.school_name ? (
                <div className={`flex gap-2 py-1.5 border-b ${theme.divider} last:border-0`}>
                  <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0">{t('child.education.schoolName')}</span>
                  <span className="text-sm text-slate-800">{educationEntry.values.school_name as string}</span>
                </div>
              ) : null}
              {educationEntry.values.class_grade ? (
                <div className={`flex gap-2 py-1.5 border-b ${theme.divider} last:border-0`}>
                  <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0">{t('child.education.classGrade')}</span>
                  <span className="text-sm text-slate-800">{educationEntry.values.class_grade as string}</span>
                </div>
              ) : null}
              {educationEntry.values.teacher_name ? (
                <div className={`flex gap-2 py-1.5 border-b ${theme.divider} last:border-0`}>
                  <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0">{t('child.education.teacherName')}</span>
                  <div>
                    <span className="text-sm text-slate-800">{educationEntry.values.teacher_name as string}</span>
                    {educationEntry.values.teacher_contact ? (
                      <p className="text-xs text-slate-500 mt-0.5">{educationEntry.values.teacher_contact as string}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {educationEntry.values.support_worker ? (
                <div className={`flex gap-2 py-1.5 border-b ${theme.divider} last:border-0`}>
                  <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0">{t('child.education.supportWorker')}</span>
                  <span className="text-sm text-slate-800">{educationEntry.values.support_worker as string}</span>
                </div>
              ) : null}
              {educationEntry.values.notes ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                  {educationEntry.values.notes as string}
                </p>
              ) : null}
            </div>
          </ExpandableSection>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg text-center py-3 text-xs ${theme.footerText} ${theme.footer} font-medium z-10`}>
        {t('common.poweredBy')}
      </footer>
      <div className="h-10" />
    </div>
  )
}

// ── Alert badge component ─────────────────────────────────────────────────────
function AlertBadge({ alert, translations, theme }: {
  alert: SharedProfileEntry
  translations: Record<string, string>
  theme: ThemeConfig
}) {
  const { t } = useTranslation()
  const [showNote, setShowNote] = useState(false)
  const alertType = alert.values.alert_type as string
  const label = alert.values.label as string
  const note = alert.values.note as string | null
  const severity = alert.values.severity as string

  // For built-in alert types, `label` is filled in at creation time with a
  // hardcoded English default (e.g. "Non-Swimmer") and is NOT translatable
  // (field_definitions marks it translatable: false, since it's really just
  // a cached display string, not parent-authored content). That string can
  // never be translated by the translate Edge Function, so for anything but
  // a genuinely custom alert we prefer the localized alertTypes.* i18n key —
  // label is only real user content when alert_type === 'custom'.
  const translatedLabel = alertType === 'custom'
    ? (translations[`alerts.${alert.id}.label`] ?? label)
    : t(`sharedPage.alertTypes.${alertType}`, { defaultValue: label })
  const translatedNote = note ? (translations[`alerts.${alert.id}.note`] ?? note) : note

  const emoji = ALERT_DISPLAY[alertType as keyof typeof ALERT_DISPLAY]?.emoji ?? '⚠️'

  return (
    <div>
      <button
        type="button"
        onClick={() => note && setShowNote(n => !n)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${
          severity === 'red' ? theme.alertBadgeRed : theme.alertBadgeOrange
        }`}
      >
        {emoji} {translatedLabel}
        {note && <span className="ml-1 opacity-70">›</span>}
      </button>
      {showNote && note && (
        <div className="mt-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 shadow-sm">
          {translatedNote}
        </div>
      )}
    </div>
  )
}
