// Service-role PostgREST / Auth helpers for Edge Functions (Deno).
// Plain fetch, no supabase-js — every function in this project uses the
// same approach so there's one way to talk to the database.
//
// The service-role key BYPASSES RLS. Anything built on these helpers is
// itself the authorization boundary — see getSharedChild().

export interface ServiceEnv {
  url: string
  serviceKey: string
}

export function serviceEnv(): ServiceEnv {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
  return { url, serviceKey }
}

export function serviceHeaders(env: ServiceEnv, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

/** GET a PostgREST path (e.g. "children?id=eq.x&select=id") and return rows. Throws on non-2xx. */
export async function restSelect<T>(env: ServiceEnv, pathAndQuery: string): Promise<T[]> {
  const res = await fetch(`${env.url}/rest/v1/${pathAndQuery}`, { headers: serviceHeaders(env) })
  if (!res.ok) throw new Error(`select ${pathAndQuery.split('?')[0]} failed: ${res.status} ${await res.text()}`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows as T[] : []
}

/** POST rows to a PostgREST table. Throws on non-2xx. */
export async function restInsert(
  env: ServiceEnv,
  pathAndQuery: string,
  rows: unknown,
  prefer = 'return=minimal',
): Promise<void> {
  const res = await fetch(`${env.url}/rest/v1/${pathAndQuery}`, {
    method: 'POST',
    headers: serviceHeaders(env, { Prefer: prefer }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`insert ${pathAndQuery.split('?')[0]} failed: ${res.status} ${await res.text()}`)
}

export interface SharedChild {
  id: string
  user_id: string
  profile_type: string
}

/**
 * Authorization gate for the public (no-JWT) functions: returns the child
 * only if it exists AND the parent has sharing enabled. Callers must
 * respond identically for "not found" and "not shared" so the endpoint
 * can't be used to probe which child IDs exist.
 */
export async function getSharedChild(env: ServiceEnv, childId: string): Promise<SharedChild | null> {
  const rows = await restSelect<SharedChild & { sharing_enabled: boolean }>(
    env,
    `children?id=eq.${encodeURIComponent(childId)}&select=id,user_id,profile_type,sharing_enabled`,
  )
  const child = rows[0]
  return child && child.sharing_enabled === true
    ? { id: child.id, user_id: child.user_id, profile_type: child.profile_type }
    : null
}
