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

// Every colour class has a `dark:` partner so each share theme has its own dark
// variant (driven by the `dark` class on <html>, same as the rest of the app).
export const THEMES: Record<BuiltInTheme, ThemeConfig> = {
  professional: {
    pageBg:           'bg-slate-200 dark:bg-slate-950',
    card:             'bg-white rounded-lg border border-slate-300 dark:bg-slate-900 dark:border-slate-700',
    triggerCardBg:    'bg-white rounded-xl border border-slate-300 dark:bg-slate-900 dark:border-slate-700',
    triggerHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-400',
    triggerText:      'text-slate-900 dark:text-slate-50',
    talkCardBg:       'bg-white rounded-xl border border-slate-300 dark:bg-slate-900 dark:border-slate-700',
    talkHeading:      'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-400',
    talkText:         'text-slate-800 dark:text-slate-100',
    contactRow:       'bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:active:bg-slate-800',
    footer:           'bg-slate-200 border-t border-slate-300 dark:bg-slate-950 dark:border-slate-800',
    footerText:       'text-slate-500 dark:text-slate-400',
    sectionHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-400',
    divider:          'border-slate-100 dark:border-slate-800',
    deEscBorder:      'border-slate-300 dark:border-slate-600',
    alertBar:         'bg-red-700 rounded-xl dark:bg-red-900',
    alertHeading:     'text-red-200',
    alertBadgeRed:    'bg-red-800 text-red-100 dark:bg-red-950',
    alertBadgeOrange: 'bg-amber-700 text-white dark:bg-amber-800',
    contactIcon:      'bg-green-50 border border-green-200 dark:bg-green-950/50 dark:border-green-900',
    contactPhone:     'text-slate-900 dark:text-slate-50',
    photoPlaceholder: 'bg-slate-100 dark:bg-slate-800',
    photoRadius:      'rounded-lg',
    commBadgeRadius:  'rounded-md',
    listBullet:       '',
  },
  warm: {
    pageBg:           'bg-orange-50 dark:bg-stone-950',
    card:             'bg-white rounded-2xl border border-orange-100 shadow-sm dark:bg-stone-900 dark:border-orange-950 dark:shadow-none',
    triggerCardBg:    'bg-red-50 rounded-2xl border border-red-100 dark:bg-red-950/40 dark:border-red-900/60',
    triggerHeading:   'text-xs font-bold text-red-600 uppercase tracking-widest dark:text-red-300',
    triggerText:      'text-red-900 dark:text-red-100',
    talkCardBg:       'bg-blue-50 rounded-2xl border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60',
    talkHeading:      'text-xs font-bold text-blue-600 uppercase tracking-widest dark:text-blue-300',
    talkText:         'text-blue-900 dark:text-blue-100',
    contactRow:       'bg-green-50 border border-green-200 rounded-2xl shadow-sm hover:bg-green-100 active:bg-green-100 dark:bg-green-950/40 dark:border-green-900 dark:shadow-none dark:hover:bg-green-950/70 dark:active:bg-green-950/70',
    footer:           'bg-orange-50 border-t border-orange-200 dark:bg-stone-950 dark:border-orange-950',
    footerText:       'text-orange-700 dark:text-orange-300',
    sectionHeading:   'text-xs font-semibold text-orange-700 uppercase tracking-widest dark:text-orange-300',
    divider:          'border-orange-100 dark:border-orange-950',
    deEscBorder:      'border-orange-300 dark:border-orange-800',
    alertBar:         'bg-red-50 rounded-2xl border border-red-200 dark:bg-red-950/40 dark:border-red-900',
    alertHeading:     'text-red-700 dark:text-red-300',
    alertBadgeRed:    'bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/60 dark:border-red-800 dark:text-red-100',
    alertBadgeOrange: 'bg-orange-100 border border-orange-300 text-orange-800 dark:bg-orange-900/60 dark:border-orange-800 dark:text-orange-100',
    contactIcon:      'bg-green-100 border border-green-300 dark:bg-green-900/50 dark:border-green-800',
    contactPhone:     'text-green-700 dark:text-green-300',
    photoPlaceholder: 'bg-orange-100 dark:bg-stone-800',
    photoRadius:      'rounded-2xl',
    commBadgeRadius:  'rounded-full',
    listBullet:       '• ',
  },
  playful: {
    pageBg:           'bg-violet-100 dark:bg-violet-950',
    card:             'bg-white rounded-3xl border-2 border-violet-200 shadow-md dark:bg-slate-900 dark:border-violet-800 dark:shadow-none',
    triggerCardBg:    'bg-red-50 rounded-3xl border-2 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    triggerHeading:   'text-xs font-bold text-red-600 uppercase tracking-widest dark:text-red-300',
    triggerText:      'text-red-900 dark:text-red-100',
    talkCardBg:       'bg-sky-50 rounded-3xl border-2 border-sky-200 dark:bg-sky-950/50 dark:border-sky-800',
    talkHeading:      'text-xs font-bold text-sky-600 uppercase tracking-widest dark:text-sky-300',
    talkText:         'text-sky-900 dark:text-sky-100',
    contactRow:       'bg-green-50 border-2 border-green-200 rounded-3xl shadow-md hover:bg-green-100 active:bg-green-100 dark:bg-green-950/50 dark:border-green-800 dark:shadow-none dark:hover:bg-green-950/80 dark:active:bg-green-950/80',
    footer:           'bg-violet-100 border-t border-violet-300 dark:bg-violet-950 dark:border-violet-800',
    footerText:       'text-violet-600 dark:text-violet-300',
    sectionHeading:   'text-xs font-bold text-violet-600 uppercase tracking-widest dark:text-violet-300',
    divider:          'border-violet-100 dark:border-violet-900',
    deEscBorder:      'border-violet-300 dark:border-violet-700',
    alertBar:         'bg-red-50 rounded-3xl border-2 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    alertHeading:     'text-red-700 dark:text-red-300',
    alertBadgeRed:    'bg-red-100 border-2 border-red-300 text-red-800 dark:bg-red-900/60 dark:border-red-700 dark:text-red-100',
    alertBadgeOrange: 'bg-orange-100 border-2 border-orange-300 text-orange-800 dark:bg-orange-900/60 dark:border-orange-700 dark:text-orange-100',
    contactIcon:      'bg-green-100 border-2 border-green-300 dark:bg-green-900/50 dark:border-green-700',
    contactPhone:     'text-green-700 dark:text-green-300',
    photoPlaceholder: 'bg-violet-100 dark:bg-violet-900',
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
