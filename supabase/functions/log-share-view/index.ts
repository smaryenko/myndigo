// Supabase Edge Function: log-share-view
// Public endpoint — no JWT required (--no-verify-jwt flag on deploy).
// Called once per shared-page view.
//
// Uses the service-role key (bypasses RLS), so it must not trust child_id
// blindly — it only logs/notifies for children that are actually shared.
// Always responds { ok: true } so the endpoint can't be used to probe which
// child IDs exist or are shared.

import { corsHeaders, isUuid, json, preflight, runInBackground } from '../_shared/http.ts'
import { getSharedChild, restInsert, restSelect, serviceEnv, serviceHeaders, type ServiceEnv } from '../_shared/rest.ts'

const CORS = corsHeaders('*')
const OK = () => json({ ok: true }, CORS)

// Minimum time between "someone viewed your child's profile" emails for the
// same child — stops a repeat viewer (or an attacker looping this endpoint)
// from spamming the parent's inbox.
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

interface ViewLocation {
  latitude: number | null
  longitude: number | null
  geoSource: 'browser' | 'ip' | null
  city: string | null
  country: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(CORS)

  try {
    const { child_id, user_agent, latitude, longitude } = await req.json()
    if (!isUuid(child_id)) return json({ error: 'valid child_id required' }, CORS, 400)

    const env = serviceEnv()

    // ── Authorization gate ──────────────────────────────────────────────
    const child = await getSharedChild(env, child_id)
    if (!child) return OK()

    // ── Location: browser coordinates if supplied, else IP geolocation ──
    const location = validCoords(latitude, longitude)
      ? { latitude, longitude, geoSource: 'browser', city: null, country: null } satisfies ViewLocation
      : await ipLocation(req)

    // user_agent is stored verbatim and later emailed to the parent — cap
    // its length so a caller can't stash an arbitrarily large payload.
    const safeUserAgent = typeof user_agent === 'string' ? user_agent.slice(0, 512) : null

    await restInsert(env, 'share_audit_log', {
      child_id: child.id,
      user_agent: safeUserAgent,
      latitude: location.latitude,
      longitude: location.longitude,
      geo_source: location.geoSource,
      ip_city: location.city,
      ip_country: location.country,
    })

    // Email notification — kept alive past the response via waitUntil,
    // never blocks or fails the viewer's request.
    runInBackground(notifyParent(env, child.user_id, child.id, safeUserAgent, location))

    return OK()
  } catch (err) {
    console.error('log-share-view: error:', err)
    return OK()
  }
})

function validCoords(lat: unknown, lon: unknown): lat is number {
  return typeof lat === 'number' && typeof lon === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

/** Real client IP from the platform's forwarding headers. */
function extractIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return null
}

const NO_LOCATION: ViewLocation = { latitude: null, longitude: null, geoSource: null, city: null, country: null }

/**
 * Approximate location via ipwho.is — HTTPS (the viewer's IP is never sent
 * in cleartext), no API key. Free tier: 1,000 lookups/day per calling IP,
 * shared across all views; over the limit it returns 429 and the view is
 * simply logged without a location. Never throws.
 */
async function ipLocation(req: Request): Promise<ViewLocation> {
  const ip = extractIp(req)
  if (!ip || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/i.test(ip)) return NO_LOCATION
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return NO_LOCATION
    const data = await res.json()
    if (data?.success !== true) return NO_LOCATION
    return {
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      geoSource: 'ip',
      city: typeof data.city === 'string' ? data.city : null,
      country: typeof data.country === 'string' ? data.country : null,
    }
  } catch {
    return NO_LOCATION
  }
}

async function notifyParent(
  env: ServiceEnv,
  userId: string,
  childId: string,
  userAgent: string | null,
  location: ViewLocation,
): Promise<void> {
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('NOTIFICATION_EMAIL_FROM')
    if (!resendKey || !emailFrom) return

    // Cooldown: the row for *this* view was just inserted, so more than one
    // row inside the window means we already notified recently.
    const cutoff = new Date(Date.now() - NOTIFY_COOLDOWN_MS).toISOString()
    const recent = await restSelect<{ id: string }>(
      env,
      `share_audit_log?child_id=eq.${childId}&viewed_at=gte.${encodeURIComponent(cutoff)}&select=id&limit=2`,
    )
    if (recent.length > 1) return

    const [prefs, names] = await Promise.all([
      restSelect<{ notify_on_view: boolean }>(env, `user_preferences?user_id=eq.${userId}&select=notify_on_view`),
      restSelect<{ name: string }>(env, `personal_info?child_id=eq.${childId}&select=name`),
    ])

    // Opt-out model: parents are notified unless they have a
    // user_preferences row with notify_on_view = false. A missing row means
    // "never changed the setting" and is treated as opted in. (The column's
    // own default of false only applies once a row is created.)
    if (prefs[0]?.notify_on_view === false) return

    const childName = names[0]?.name || 'your child'

    const userRes = await fetch(`${env.url}/auth/v1/admin/users/${userId}`, { headers: serviceHeaders(env) })
    if (!userRes.ok) return
    const email = (await userRes.json())?.email
    if (!email) return

    let locationText = 'Location: not available'
    if (location.city || location.country) {
      locationText = `Location: ${[location.city, location.country].filter(Boolean).join(', ')} (approximate, via IP)`
    } else if (location.latitude != null && location.longitude != null) {
      locationText = `Location: ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)} (${location.geoSource ?? 'unknown'})`
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: `Someone viewed ${childName}'s profile`,
        text: `Someone just viewed ${childName}'s shared profile.\n\nTime: ${new Date().toUTCString()}\nDevice: ${userAgent ?? 'Unknown'}\n${locationText}\n\n— Myndigo`,
      }),
    })
    if (!res.ok) console.error('log-share-view: resend failed:', res.status, await res.text())
  } catch (err) {
    console.error('log-share-view: notify failed:', err)
  }
}
