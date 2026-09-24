import { useState } from 'react'
import { SAVED_FLASH_MS } from '../lib/constants'

/**
 * Manages saving/saved state for single-record save sections.
 * Returns { saving, saved, executeSave } where executeSave wraps
 * an async function with try/finally and flashes the saved indicator.
 */
export function useSaveState() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const executeSave = async (fn: () => Promise<void>): Promise<void> => {
    setSaving(true)
    try {
      await fn()
      setSaved(true)
      setTimeout(() => setSaved(false), SAVED_FLASH_MS)
    } finally {
      setSaving(false)
    }
  }

  return { saving, saved, executeSave }
}
