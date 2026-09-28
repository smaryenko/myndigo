// ── Shared Tailwind class constants ──────────────────────────────────────────
// Single source of truth for repeated className strings. Prefer these over
// inlining the same utility list in a component.

/** Chevron icon for native <select> elements (appearance-none hides the default). */
const SELECT_CHEVRON =
  "appearance-none bg-white bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"

const FOCUS = 'focus:outline-none focus:ring-2 focus:ring-indigo-400'

/** Standard text input field */
export const INPUT = `w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm ${FOCUS}`

/** Smaller input used inside add-item forms */
export const INPUT_SM = `w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm ${FOCUS}`

/** Standard <select> */
export const SELECT = `w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-8 text-sm bg-[right_0.5rem_center] ${SELECT_CHEVRON} ${FOCUS}`

/** Smaller <select> used inside add-item forms */
export const SELECT_SM = `w-full rounded-lg border border-slate-200 px-2.5 py-2 pr-8 text-sm bg-[right_0.5rem_center] ${SELECT_CHEVRON} ${FOCUS}`

/** Compact <select> used in navigation bars */
export const SELECT_XS = `text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-6 text-slate-600 bg-[right_0.25rem_center] ${SELECT_CHEVRON} ${FOCUS}`

/** Form label above an input */
export const LABEL = 'block text-sm font-medium text-slate-700 mb-1'

/** Small form label used inside add-item forms */
export const LABEL_SM = 'block text-xs font-medium text-slate-600 mb-1'

/** Primary action button */
export const BTN_PRIMARY = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors'

/** Secondary / cancel button */
export const BTN_SECONDARY = 'border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors'

/** Small primary button used inside inline forms */
export const BTN_PRIMARY_SM = 'flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors'

/** Small secondary button used inside inline forms */
export const BTN_SECONDARY_SM = 'flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50'

/** Extra-small buttons for compact inline edit rows */
export const BTN_PRIMARY_XS = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors'
export const BTN_SECONDARY_XS = 'border border-slate-200 text-slate-500 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50'

/** Destructive confirm button */
export const BTN_DANGER = 'bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors'

/** Destructive trigger (outlined) */
export const BTN_DANGER_OUTLINE = 'text-sm text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors'

/** Neutral cancel next to a destructive confirm */
export const BTN_CANCEL = 'border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors'

/** Pill-style toggle button (language pickers, option chips) */
export const PILL = 'px-3 py-1.5 rounded-full text-sm border transition-colors'
export const PILL_ACTIVE = 'bg-indigo-600 text-white border-indigo-600'
export const PILL_INACTIVE = 'border-slate-200 text-slate-600 hover:border-indigo-300'

/** White card with subtle border — used across all page sections */
export const CARD = 'bg-white rounded-2xl border border-slate-100 p-5'
