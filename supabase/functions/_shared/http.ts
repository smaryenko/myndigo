// Shared HTTP helpers for Edge Functions (Deno). No imports.

// supabase.functions.invoke() sends authorization, apikey, x-client-info
// and content-type — every one must be allowed or the preflight fails.
const ALLOW_HEADERS = 'authorization, apikey, x-client-info, content-type'

export function corsHeaders(allowOrigin = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
  }
}

export function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

export function preflight(cors: Record<string, string>): Response {
  return new Response('ok', { headers: cors })
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Keep background work alive after the response is sent. Supabase's Edge
 * Runtime may stop a worker once the response is returned, so un-awaited
 * promises (e.g. a notification email) can be cut off. Falls back to a
 * plain un-awaited promise where EdgeRuntime isn't available (local tools).
 */
export function runInBackground(promise: Promise<unknown>): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
  if (runtime?.waitUntil) runtime.waitUntil(promise)
  else promise.catch(err => console.error('background task failed:', err))
}
