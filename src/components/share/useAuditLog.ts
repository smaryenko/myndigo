import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clearAuditLog, getAuditLogBefore } from '../../lib/db'
import { toUserMessage } from '../../lib/errors'
import { AUDIT_PAGE_SIZE } from '../../lib/constants'
import type { ShareAuditLogRow } from '../../lib/types'

/** Audit-log list state: initial page from the page loader, "load more" and clear. */
export function useAuditLog(childId: string, initial: ShareAuditLogRow[], initialTotal: number) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState(initial)
  const [total, setTotal] = useState(initialTotal)
  const [loadingMore, setLoadingMore] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMore = async () => {
    const oldest = entries[entries.length - 1]
    if (!oldest) return
    setError(null)
    setLoadingMore(true)
    try {
      const page = await getAuditLogBefore(childId, oldest.viewed_at, AUDIT_PAGE_SIZE)
      setEntries(prev => [...prev, ...page.filter(p => !prev.some(e => e.id === p.id))])
    } catch (err) {
      setError(toUserMessage(err, t('common.error')))
    } finally {
      setLoadingMore(false)
    }
  }

  const clear = async () => {
    setError(null)
    setClearing(true)
    try {
      await clearAuditLog(childId)
      setEntries([])
      setTotal(0)
    } catch (err) {
      setError(toUserMessage(err, t('common.deleteFailed')))
    } finally {
      setClearing(false)
    }
  }

  return { entries, total, loadingMore, clearing, error, loadMore, clear }
}
