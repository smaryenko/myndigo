import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onEdit?: () => void
  /** Only called after the user confirms. */
  onDelete: () => unknown
  /** Optional reorder controls (omit to hide). */
  onMoveUp?: () => void
  onMoveDown?: () => void
  /** Accessible name of the item, e.g. the contact's name. */
  itemLabel?: string
}

const ACTION = 'text-xs text-slate-400 hover:text-indigo-600 disabled:opacity-30'

/**
 * Edit / delete (with inline confirmation) / optional move up & down for
 * one list item. Delete never fires on a single tap — a mis-tap on a phone
 * shouldn't silently remove a medication or an emergency contact.
 */
export function ItemActions({ onEdit, onDelete, onMoveUp, onMoveDown, itemLabel }: Props) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-2" role="group" aria-label={t('common.confirmDelete')}>
        <span className="text-xs text-red-600">{t('common.confirmDelete')}</span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try { await onDelete() } finally { setBusy(false); setConfirming(false) }
          }}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {t('common.yesDelete')}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-400 hover:text-slate-600">
          {t('common.cancel')}
        </button>
      </span>
    )
  }

  return (
    <>
      {onMoveUp !== undefined || onMoveDown !== undefined ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className={ACTION}
            aria-label={itemLabel ? `${t('common.moveUp')}: ${itemLabel}` : t('common.moveUp')}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className={ACTION}
            aria-label={itemLabel ? `${t('common.moveDown')}: ${itemLabel}` : t('common.moveDown')}
          >
            ↓
          </button>
        </span>
      ) : null}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={ACTION}
          aria-label={itemLabel ? `${t('common.edit')}: ${itemLabel}` : undefined}
        >
          {t('common.edit')}
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-slate-400 hover:text-red-500"
        aria-label={itemLabel ? `${t('common.delete')}: ${itemLabel}` : undefined}
      >
        {t('common.delete')}
      </button>
    </>
  )
}
