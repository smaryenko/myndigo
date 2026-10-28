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
    pageBg:           'bg-slate-200 dark:bg-slate-900',
    card:             'bg-white rounded-lg border border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    triggerCardBg:    'bg-white rounded-xl border border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    triggerHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-300',
    triggerText:      'text-slate-900 dark:text-slate-50',
    talkCardBg:       'bg-white rounded-xl border border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    talkHeading:      'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-300',
    talkText:         'text-slate-800 dark:text-slate-100',
    contactRow:       'bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-700',
    footer:           'bg-slate-200 border-t border-slate-300 dark:bg-slate-900 dark:border-slate-700',
    footerText:       'text-slate-500 dark:text-slate-400',
    sectionHeading:   'text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-slate-400',
    divider:          'border-slate-100 dark:border-slate-700',
    deEscBorder:      'border-slate-300 dark:border-slate-600',
    alertBar:         'bg-red-700 dark:bg-red-900/80',
    alertHeading:     'text-red-200',
    alertBadgeRed:    'bg-red-800 text-red-100 dark:bg-red-900',
    alertBadgeOrange: 'bg-amber-700 text-white dark:bg-amber-800',
    contactIcon:      'bg-green-50 border border-green-200 dark:bg-green-900/50 dark:border-green-700',
    contactPhone:     'text-slate-900 dark:text-slate-50',
    photoPlaceholder: 'bg-slate-100 dark:bg-slate-700',
    photoRadius:      'rounded-lg',
    commBadgeRadius:  'rounded-md',
    listBullet:       '',
  },
  warm: {
    pageBg:           'bg-orange-50 dark:bg-slate-900',
    card:             'bg-white rounded-2xl border border-orange-100 shadow-sm dark:bg-orange-950 dark:border-orange-800 dark:shadow-none',
    triggerCardBg:    'bg-orange-50 dark:bg-orange-950/80',
    triggerHeading:   'text-xs font-bold text-orange-700 uppercase tracking-widest dark:text-orange-200',
    triggerText:      'text-orange-900 dark:text-orange-100',
    talkCardBg:       'bg-amber-50 dark:bg-orange-950/80',
    talkHeading:      'text-xs font-bold text-amber-700 uppercase tracking-widest dark:text-orange-200',
    talkText:         'text-amber-900 dark:text-orange-100',
    contactRow:       'bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 active:bg-amber-100 dark:bg-orange-950 dark:border-orange-800 dark:hover:bg-orange-900 dark:active:bg-orange-900',
    footer:           'bg-orange-50 border-t border-orange-200 dark:bg-slate-900 dark:border-orange-900/70',
    footerText:       'text-orange-700 dark:text-orange-200',
    sectionHeading:   'text-xs font-semibold text-orange-700 uppercase tracking-widest dark:text-orange-200',
    divider:          'border-orange-100 dark:border-orange-900/70',
    deEscBorder:      'border-fuchsia-500 dark:border-fuchsia-500',
    alertBar:         'bg-red-50 dark:bg-red-950/40',
    alertHeading:     'text-red-700 dark:text-red-200',
    alertBadgeRed:    'bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-100',
    alertBadgeOrange: 'bg-orange-100 border border-orange-300 text-orange-800 dark:bg-orange-950/60 dark:border-orange-900 dark:text-orange-100',
    contactIcon:      'bg-amber-100 border border-amber-300 dark:bg-emerald-950/40 dark:border-emerald-900',
    contactPhone:     'text-amber-700 dark:text-orange-200',
    photoPlaceholder: 'bg-orange-100 dark:bg-orange-950',
    photoRadius:      'rounded-2xl',
    commBadgeRadius:  'rounded-full',
    listBullet:       '• ',
  },
  playful: {
    pageBg:           'bg-violet-100 dark:bg-sky-950',
    card:             'bg-white rounded-3xl border-2 border-violet-200 shadow-md dark:bg-sky-900 dark:border-sky-700 dark:shadow-none',
    triggerCardBg:    'bg-violet-50 dark:bg-sky-900/80',
    triggerHeading:   'text-xs font-bold text-violet-700 uppercase tracking-widest dark:text-sky-200',
    triggerText:      'text-violet-900 dark:text-sky-100',
    talkCardBg:       'bg-sky-50 dark:bg-sky-900/80',
    talkHeading:      'text-xs font-bold text-sky-600 uppercase tracking-widest dark:text-sky-200',
    talkText:         'text-sky-900 dark:text-sky-100',
    contactRow:       'bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:bg-green-100 dark:bg-sky-900/80 dark:border-teal-700 dark:hover:bg-sky-800 dark:active:bg-sky-800',
    footer:           'bg-violet-100 border-t border-violet-300 dark:bg-sky-950 dark:border-sky-800',
    footerText:       'text-violet-600 dark:text-sky-200',
    sectionHeading:   'text-xs font-bold text-violet-600 uppercase tracking-widest dark:text-sky-200',
    divider:          'border-violet-100 dark:border-sky-800',
    deEscBorder:      'border-fuchsia-500 dark:border-fuchsia-500',
    alertBar:         'bg-red-50 dark:bg-rose-950/60',
    alertHeading:     'text-red-700 dark:text-rose-200',
    alertBadgeRed:    'bg-red-100 border-2 border-red-300 text-red-800 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-100',
    alertBadgeOrange: 'bg-orange-100 border-2 border-orange-300 text-orange-800 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-100',
    contactIcon:      'bg-green-100 border-2 border-green-300 dark:bg-sky-800 dark:border-teal-700',
    contactPhone:     'text-green-700 dark:text-sky-100',
    photoPlaceholder: 'bg-violet-100 dark:bg-sky-800',
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
