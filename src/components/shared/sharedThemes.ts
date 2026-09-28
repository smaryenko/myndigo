// ============================================================
// Shared (public) page themes — Tailwind class sets per theme.
//
// Keyed by BuiltInTheme (not the wider ShareTheme) so adding/removing a
// theme in lib/themes.ts is a compile error here until updated; unknown or
// legacy values fall back to 'professional' in resolveTheme().
//   professional — slate/white, clinical, tight
//   warm         — softer: amber tints, rounder cards, gentle shadows
//   playful      — cheerful: matches the landing page mock preview
// ============================================================

import { THEME_KEYS, type BuiltInTheme } from '../../lib/themes'

export interface ThemeConfig {
  /** Page background */
  pageBg: string
  /** Standard card (identity block, expandable sections) */
  card: string
  /** Triggers grid card */
  triggerCardBg: string
  triggerHeading: string
  triggerText: string
  /** Talk-to-me grid card */
  talkCardBg: string
  talkHeading: string
  talkText: string
  /** Emergency contact row */
  contactRow: string
  /** Footer bar + text */
  footer: string
  footerText: string
  /** Language picker button */
  langBtn: string
  /** Sub-heading inside grouped cards (e.g. Medications within Medical) */
  sectionHeading: string
  /** Divider between items */
  divider: string
  /** Indent border for secondary lines (de-escalation etc.) */
  deEscBorder: string
  /** Alert bar wrapper + heading */
  alertBar: string
  alertHeading: string
  /** Alert badges by severity */
  alertBadgeRed: string
  alertBadgeOrange: string
  /** Contact icon circle + phone text */
  contactIcon: string
  contactPhone: string
  /** Photo placeholder + radius */
  photoPlaceholder: string
  photoRadius: string
  /** Communication level badge shape */
  commBadgeRadius: string
  /** Bullet prefix for list items ('' = none) */
  listBullet: string
}

export const THEMES: Record<BuiltInTheme, ThemeConfig> = {
  professional: {
    pageBg:           'bg-slate-200',
    card:             'bg-white rounded-lg border border-slate-300',
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
    card:             'bg-white rounded-2xl border border-orange-100 shadow-sm',
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
    card:             'bg-white rounded-3xl border-2 border-violet-200 shadow-md',
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

/** Theme config for a stored share_theme value; unknown values → professional. */
export function resolveTheme(shareTheme: string | null | undefined): ThemeConfig {
  return (THEME_KEYS as readonly string[]).includes(shareTheme ?? '')
    ? THEMES[shareTheme as BuiltInTheme]
    : THEMES.professional
}
