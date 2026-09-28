import { useCallback, useEffect, useLayoutEffect, useRef, useState, type SetStateAction } from 'react'

interface AsyncState<T> {
  key: unknown
  data: T | null
  error: unknown
  loading: boolean
}

/**
 * Runs `fn` whenever `key` changes and tracks loading / data / error.
 * A response for a previous key (or after unmount) is ignored, so fast
 * navigation between records can never show stale data.
 *
 * `fn` may be a fresh closure every render — only `key` triggers a reload.
 * Pass `null` as fn to skip loading (e.g. missing route param).
 */
export function useAsync<T>(fn: (() => Promise<T>) | null, key: unknown) {
  const fnRef = useRef(fn)
  useLayoutEffect(() => { fnRef.current = fn })

  const [state, setState] = useState<AsyncState<T>>({ key, data: null, error: null, loading: fn !== null })

  useEffect(() => {
    const run = fnRef.current
    if (!run) return
    let cancelled = false
    setState({ key, data: null, error: null, loading: true })
    run()
      .then(data => { if (!cancelled) setState({ key, data, error: null, loading: false }) })
      .catch(error => {
        console.error(error)
        if (!cancelled) setState({ key, data: null, error, loading: false })
      })
    return () => { cancelled = true }
  }, [key])

  /** Update the loaded data locally (after a successful save, etc.). */
  const setData = useCallback((update: SetStateAction<T | null>) => {
    setState(s => ({
      ...s,
      data: typeof update === 'function' ? (update as (prev: T | null) => T | null)(s.data) : update,
    }))
  }, [])

  // Until the effect for a new key has run, report loading rather than the old key's data.
  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: current ? state.loading : fn !== null,
    setData,
  }
}
