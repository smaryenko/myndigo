// Supabase Edge Function: log-share-view
// Public endpoint — no JWT required (--no-verify-jwt flag on deploy)
// Called from the shared profile page with plain fetch + apikey header only.
//
// This function uses the service-role key, which bypasses RLS entirely, so
// it must not trust child_id blindly — it only logs/notifies for children
// that are actually shared (sharing_enabled = true). See resolveSharedChild().

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, x-client-info',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Minimum time between "someone viewed your child's profile" emails for the
// same child — prevents an attacker (or a curious repeat viewer) from
// spamming the parent's inbox by hitting this endpoint repeatedly.
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  console.log('log-share-view: invoked')

  try {
    const body = await req.json()
    const { child_id, user_agent, latitude, longitude, geo_source } = body

    if (!child_id || !UUID_RE.test(child_id)) {
      return new Response(JSON.stringify({ error: 'valid child_id required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('log-share-view: missing env vars')
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const dbHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    }

    // ── Authorization gate ──────────────────────────────────────────────
    // Only log/notify for children the parent has actually chosen to share.
    // Silently no-op (but still return ok) for anything else, so this
    // endpoint can't be used to probe which child IDs exist.
    const childRes = await fetch(
      `${supabaseUrl}/rest/v1/children?id=eq.${child_id}&select=id,user_id,sharing_enabled`,
      { headers: dbHeaders },
    )
    const childRows = await childRes.json()
    const child = Array.isArray(childRows) ? childRows[0] : null
    if (!child || child.sharing_enabled !== true) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── IP geolocation (server-side, no API key required) ──────────────────
    // Only attempt if browser didn't already supply coordinates.
    let resolvedLat = latitude ?? null
    let resolvedLon = longitude ?? null
    let resolvedGeoSource = geo_source ?? null
    let ipCity: string | null = null
    let ipCountry: string | null = null

    if (resolvedLat == null) {
      const clientIp = extractIp(req)
      if (clientIp) {
        const geo = await ipGeolocate(clientIp)
        if (geo) {
          resolvedLat = geo.lat
          resolvedLon = geo.lon
          resolvedGeoSource = 'ip'
          ipCity = geo.city ?? null
          ipCountry = geo.country ?? null
        }
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // user_agent is stored verbatim and later emailed to the parent — cap
    // its length so a malicious caller can't stash an arbitrarily large
    // payload in the audit log via this field.
    const safeUserAgent = typeof user_agent === 'string' ? user_agent.slice(0, 512) : null

    const res = await fetch(`${supabaseUrl}/rest/v1/share_audit_log`, {
      method: 'POST',
      headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        child_id,
        user_agent: safeUserAgent,
        latitude: resolvedLat,
        longitude: resolvedLon,
        geo_source: resolvedGeoSource,
        ip_city: ipCity,
        ip_country: ipCountry,
      }),
    })

    const resText = await res.text()
    console.log('log-share-view: insert status =', res.status, resText || '(empty)')

    // Email notification — fire and forget, never blocks
    notifyParent(supabaseUrl, serviceRoleKey, child.user_id, child_id, safeUserAgent, resolvedLat, resolvedLon, resolvedGeoSource, ipCity, ipCountry)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('log-share-view: error:', err)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

/** Extract the real client IP from Supabase/Cloudflare forwarding headers */
function extractIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return null
}

interface GeoResult {
  lat: number
  lon: number
  city?: string
  country?: string
}

/**
 * Calls ip-api.com (free tier, no key, 45 req/min).
 * Returns null on any failure so the log insert still proceeds.
 */
async function ipGeolocate(ip: string): Promise<GeoResult | null> {
  try {
    // Skip private / loopback addresses
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)/i.test(ip)) {
      return null
    }
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,country`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'success') return null
    return { lat: data.lat, lon: data.lon, city: data.city, country: data.country }
  } catch {
    return null
  }
}

async function notifyParent(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  childId: string,
  userAgent?: string | null,
  latitude?: number | null,
  longitude?: number | null,
  geoSource?: string | null,
  ipCity?: string | null,
  ipCountry?: string | null,
) {
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('NOTIFICATION_EMAIL_FROM')
    if (!resendKey || !emailFrom) return

    const dbHeaders = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }

    // Cooldown: skip if we already notified for this child recently.
    // Cheap abuse mitigation — a repeat viewer or attacker hitting this
    // endpoint in a loop shouldn't be able to spam the parent's inbox.
    const cooldownCutoff = new Date(Date.now() - NOTIFY_COOLDOWN_MS).toISOString()
    const recentRes = await fetch(
      `${supabaseUrl}/rest/v1/share_audit_log?child_id=eq.${childId}&viewed_at=gte.${cooldownCutoff}&select=id&limit=2`,
      { headers: dbHeaders },
    )
    const recent = await recentRes.json()
    if (Array.isArray(recent) && recent.length > 1) return // this view + at least one earlier one within cooldown

    const [prefRes, nameRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/user_preferences?select=notify_on_view&user_id=eq.${userId}`, { headers: dbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/personal_info?child_id=eq.${childId}&select=name`, { headers: dbHeaders }),
    ])

    const prefs = await prefRes.json()
    // Default to notifying if no preference row exists yet (matches the
    // schema default of notify_on_view = false being an explicit opt-out,
    // not opt-in by omission would be surprising — only skip on an explicit false).
    if (Array.isArray(prefs) && prefs[0]?.notify_on_view === false) return

    const nameData = await nameRes.json()
    const childName = nameData?.[0]?.name ?? 'your child'

    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { headers: dbHeaders })
    const userData = await userRes.json()
    const email = userData?.email
    if (!email) return

    let locationText = 'Location: not available'
    if (ipCity || ipCountry) {
      locationText = `Location: ${[ipCity, ipCountry].filter(Boolean).join(', ')} (approximate, via IP)`
    } else if (latitude != null && longitude != null) {
      locationText = `Location: ${latitude.toFixed(2)}, ${longitude.toFixed(2)} (${geoSource ?? 'unknown'})`
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: `Someone viewed ${childName}'s profile`,
        text: `Someone just viewed ${childName}'s shared profile.\n\nTime: ${new Date().toUTCString()}\nDevice: ${userAgent ?? 'Unknown'}\n${locationText}\n\n— Myndigo`,
      }),
    })
  } catch (err) {
    console.error('log-share-view: notify failed:', err)
  }
}
