import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SAVED_FLASH_MS } from '../lib/constants'
import { toUserMessage } from '../lib/errors'

/**
 * saving / saved / error state for a save action. executeSave() never
 * throws: on failure it records a user-safe message in `error` and
 * resolves to false, so callers can use it directly as an onClick handler.
 */
export function useSaveState() {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const executeSave = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      await fn()
      setSaved(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS)
      return true
    } catch (err) {
      setSaved(false)
      setError(toUserMessage(err, t('common.saveFailed')))
      return false
    } finally {
      setSaving(false)
    }
  }, [t])

  return { saving, saved, error, setError, executeSave }
}
