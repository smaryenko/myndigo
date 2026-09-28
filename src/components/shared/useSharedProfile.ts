import { useCallback, useEffect, useRef, useState } from 'react'
import { getFieldTranslations, getSharedProfile, logShareView } from '../../lib/db'
import { setLanguage } from '../../lib/i18n'
import type { SharedProfile } from '../../lib/types'
import type { Tx } from './sharedModel'

type Status = 'loading' | 'ready' | 'notFound'

/**
 * Browser coordinates only if the viewer has ALREADY granted geolocation to
 * this site — never triggers a permission prompt. Resolves to undefined on
 * any failure or after a short timeout so logging is never held up.
 */
async function grantedCoords(): Promise<{ latitude: number; longitude: number } | undefined> {
  try {
    if (!('geolocation' in navigator) || !navigator.permissions) return undefined
    const status = await navigator.permissions.query({ name: 'geolocation' })
    if (status.state !== 'granted') return undefined
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 5000, maximumAge: 60_000 },
      )
    })
  } catch {
    return undefined
  }
}

/**
 * Loads the public profile for a share token, applies the child's default
 * share language, logs exactly one view, and manages viewer-selected
 * language + content translations.
 */
export function useSharedProfile(token: string | undefined) {
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'notFound')
  const [profile, setProfile] = useState<SharedProfile | null>(null)
  const [viewerLang, setViewerLang] = useState('en')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)

  // Increments on every language request; a response is applied only if it
  // is still the latest (switching quickly can't show an older language).
  const requestId = useRef(0)
  const logged = useRef(false)

  const applyLanguage = useCallback(async (childId: string, lang: string) => {
    const id = ++requestId.current
    setViewerLang(lang)
    // persist: false — a viewer switching language here must not overwrite
    // the UI language a parent chose for their own portal on this device.
    await setLanguage(lang)
    if (lang === 'en') {
      setTranslations({})
      setTranslating(false)
      return
    }
    setTranslating(true)
    const result = await getFieldTranslations(childId, lang)
    if (id !== requestId.current) return
    setTranslations(result)
    setTranslating(false)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getSharedProfile(token)
      .then(async data => {
        if (cancelled) return
        if (!data) { setStatus('notFound'); return }
        const lang = data.child.share_language || 'en'
        await setLanguage(lang)
        if (cancelled) return
        setProfile(data)
        setStatus('ready')
        void applyLanguage(data.child.id, lang)

        if (!logged.current) {
          logged.current = true
          // One request per view: coordinates are included only when
          // already available, otherwise the server falls back to IP.
          grantedCoords().then(coords => logShareView(data.child.id, coords))
        }
      })
      .catch(err => {
        console.error('Shared profile load failed:', err)
        if (!cancelled) setStatus('notFound')
      })
    return () => { cancelled = true }
  }, [token, applyLanguage])

  const changeLanguage = useCallback(
    (lang: string) => { if (profile) void applyLanguage(profile.child.id, lang) },
    [profile, applyLanguage],
  )

  const tx: Tx = useCallback((path, original) => translations[path] ?? original, [translations])

  return { status, profile, viewerLang, translating, changeLanguage, tx }
}
