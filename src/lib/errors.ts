// ============================================================
// Error convention
//
// - Data/auth functions THROW on failure (never return { error }).
// - Only errors wrapped in UserFacingError carry text meant for users
//   (e.g. "Invalid login credentials" from Supabase Auth).
// - Everything else — Postgres/PostgREST/network errors — is logged and
//   replaced with a translated fallback, so raw technical or
//   schema-revealing messages never reach the UI.
// ============================================================

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

// JWTs sometimes appear in auth error strings; never show them.
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_\-.+/=]*/g

/** Wraps a Supabase Auth error message as user-facing (token-scrubbed). */
export function authError(message: string | undefined): UserFacingError {
  const scrubbed = (message ?? '').replace(JWT_RE, '').trim()
  return new UserFacingError(scrubbed)
}

/**
 * Message to show for an error: its own message if it's user-facing and
 * non-empty, otherwise `fallback`. Pure — safe to call during render.
 */
export function userMessage(err: unknown, fallback: string): string {
  if (err instanceof UserFacingError && err.message) return err.message
  return fallback
}

/** Logs the original error, then returns userMessage(). Use in catch blocks. */
export function toUserMessage(err: unknown, fallback: string): string {
  console.error(err)
  return userMessage(err, fallback)
}
