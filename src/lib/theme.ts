// ── Dark / light theme ────────────────────────────────────────────────────────
// The parent portal supports three appearance choices, persisted per device:
//   'system' (default) — follow the browser / OS colour scheme, and track it live
//   'light'            — force light
//   'dark'             — force dark
//
// Tailwind is configured with darkMode: 'class', so the resolved theme is applied
// by toggling the `dark` class on <html>. main.tsx applies it before first paint
// (see applyStoredTheme) to avoid a flash of the wrong theme.

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'myndigo.theme'
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value)
}

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** The stored preference, or 'system' if unset / unreadable. */
export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isThemePreference(stored)) return stored
  } catch { /* storage unavailable — fall through */ }
  return 'system'
}

/** Resolve a preference to the concrete theme to render right now. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light'
  return preference
}

/** Toggle the `dark` class on <html> to match the resolved theme. */
function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Persist a preference and apply it immediately. Call this from the UI.
 * @returns the resolved theme that was applied
 */
export function setThemePreference(preference: ThemePreference): ResolvedTheme {
  try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* ignore */ }
  const resolved = resolveTheme(preference)
  applyResolvedTheme(resolved)
  return resolved
}

/**
 * Apply the stored preference to <html>. Call once at startup (before render)
 * so the first paint is already in the right theme.
 */
export function applyStoredTheme(): void {
  applyResolvedTheme(resolveTheme(getThemePreference()))
}

/**
 * Start listening for OS colour-scheme changes. While the preference is
 * 'system', flipping the OS theme re-applies live. Returns an unsubscribe fn.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getThemePreference() === 'system') {
      applyResolvedTheme(media.matches ? 'dark' : 'light')
    }
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export { PREFERENCES as THEME_PREFERENCES }
