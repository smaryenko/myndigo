// ============================================================
// Shared list of built-in share themes.
//
// This is the single source of truth for "which themes exist" — both
// ShareManagementPage (the picker UI) and SharedProfilePage (the actual
// rendering config) key off THEME_KEYS so adding/removing a theme can't
// silently drift between the two files. Each file still owns its own
// per-theme *values* (picker colors vs. full Tailwind class sets) since
// those are genuinely different concerns, but the set of valid keys is
// shared and type-checked.
// ============================================================

export const THEME_KEYS = ['professional', 'warm', 'playful'] as const

export type BuiltInTheme = typeof THEME_KEYS[number]
