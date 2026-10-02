// ── Dark / light theme ────────────────────────────────────────────────────────
// A single sun/moon toggle (ThemeToggle) on every page. Behaviour:
//   - no stored choice → follow the browser / OS colour scheme, live
//   - after a click    → the explicit 'light' / 'dark' choice is remembered
//                        on this device (localStorage) and wins over the OS
//
// Tailwind is configured with darkMode: 'class', so the resolved theme is applied
// by toggling the `dark` class on <html>. main.tsx applies it before first paint
// (see applyStoredTheme) to avoid a flash of the wrong theme.

export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'myndigo.theme'
const listeners = new Set<() => void>()

function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return value === 'light' || value === 'dark'
}

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** The explicit stored choice, or null when following the system. */
function storedTheme(): ResolvedTheme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isResolvedTheme(stored)) return stored
  } catch { /* storage unavailable — fall through */ }
  return null
}

/** The theme to render right now. */
export function currentTheme(): ResolvedTheme {
  return storedTheme() ?? (prefersDark() ? 'dark' : 'light')
}

function applyTheme(): void {
  document.documentElement.classList.toggle('dark', currentTheme() === 'dark')
  listeners.forEach(fn => fn())
}

/** Flip between light and dark and remember the choice on this device. */
export function toggleTheme(): void {
  const next: ResolvedTheme = currentTheme() === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  applyTheme()
}

/** Subscribe to theme changes (for useSyncExternalStore). Returns an unsubscribe fn. */
export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Apply the current theme to <html>. Call once at startup, before render. */
export function applyStoredTheme(): void {
  applyTheme()
}

/**
 * Follow OS colour-scheme changes while no explicit choice is stored.
 * Returns an unsubscribe fn.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (!storedTheme()) applyTheme() }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
