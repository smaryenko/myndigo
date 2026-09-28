// Vite exposes the configured `base` at runtime as import.meta.env.BASE_URL
// ("/myndigo/" on GitHub Pages, "/" elsewhere). window.location.origin never
// includes that path, so absolute URLs (OAuth redirects, share links, QR
// codes) must add it or they point one level too high and 404.

/** Router basename: BASE_URL without the trailing slash ("" or "/myndigo"). */
export const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Absolute URL for an in-app path, e.g. appUrl('/s/abc') → https://host/myndigo/s/abc */
export function appUrl(path: string): string {
  return `${window.location.origin}${BASENAME}${path}`
}
