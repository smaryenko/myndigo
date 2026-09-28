// Supabase Edge Function: delete-account
// Deployed WITH JWT verification. Called only from the app's own
// authenticated frontend, so CORS is restricted to APP_ORIGIN when set
// (falls back to "*" so an unconfigured deployment doesn't break).
//
// Deleting the auth user cascades to every table (children → personal_info,
// profile_entries, content_translations, share_audit_log; user_preferences).

import { corsHeaders, json, preflight } from '../_shared/http.ts'
import { serviceEnv, serviceHeaders } from '../_shared/rest.ts'

const CORS = corsHeaders(Deno.env.get('APP_ORIGIN') ?? '*')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(CORS)

  try {
    const env = serviceEnv()
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !anonKey) return json({ error: 'Unauthorized' }, CORS, 401)

    // Identify the caller from their own JWT (never from the request body).
    const userRes = await fetch(`${env.url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    })
    if (!userRes.ok) return json({ error: 'Unauthorized' }, CORS, 401)
    const user = await userRes.json()
    if (!user?.id) return json({ error: 'Unauthorized' }, CORS, 401)

    const deleteRes = await fetch(`${env.url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: serviceHeaders(env),
    })
    if (!deleteRes.ok) {
      console.error('delete-account: deleteUser failed:', deleteRes.status, await deleteRes.text())
      return json({ error: 'Account deletion failed' }, CORS, 500)
    }

    return json({ success: true }, CORS)
  } catch (err) {
    console.error('delete-account: error:', err)
    return json({ error: 'Account deletion failed' }, CORS, 500)
  }
})
