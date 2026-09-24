/**
 * Lightweight className utility — joins truthy class strings.
 * Avoids the clsx/tailwind-merge dependency for simple use cases.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ── Shared Tailwind class constants ──────────────────────────────────────────
// Single source of truth for repeated className strings across the app.

/** Standard text input field */
export const INPUT = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

/** Smaller input used inside add-item forms */
export const INPUT_SM = 'w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

/** Primary action button */
export const BTN_PRIMARY = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors'

/** Secondary / cancel button */
export const BTN_SECONDARY = 'border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors'

/** Small primary button used inside inline forms */
export const BTN_PRIMARY_SM = 'flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors'

/** Small secondary button used inside inline forms */
export const BTN_SECONDARY_SM = 'flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50'

/** White card with subtle border — used across all page sections */
export const CARD = 'bg-white rounded-2xl border border-slate-100 p-5'
