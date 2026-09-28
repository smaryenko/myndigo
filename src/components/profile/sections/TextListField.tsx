import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { INPUT } from '../../../lib/styles'
import type { FieldDefinition } from '../../../lib/types'

interface Props {
  field: FieldDefinition
  value: string[]
  onChange: (value: string[]) => void
}

/** Add / edit / remove editor for a 'text_list' field (e.g. communication instructions). */
export function TextListField({ field, value, onChange }: Props) {
  const { t } = useTranslation()
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const label = t(field.label_key)

  const handleAdd = () => {
    if (!draft.trim()) return
    onChange([...value, draft.trim()])
    setDraft('')
  }

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return
    onChange(value.map((v, i) => (i === index ? editingText.trim() : v)))
    setEditingIndex(null)
  }

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-slate-700 mb-2">{label}</legend>
      <ul className="space-y-2 mb-2">
        {value.map((item, i) =>
          editingIndex === i ? (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveEdit(i)
                  if (e.key === 'Escape') setEditingIndex(null)
                }}
                aria-label={`${t('common.edit')}: ${item}`}
                className="flex-1 rounded-lg border border-indigo-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
              <button type="button" onClick={() => handleSaveEdit(i)} className="text-xs text-indigo-600 font-medium">{t('common.save')}</button>
              <button type="button" onClick={() => setEditingIndex(null)} className="text-xs text-slate-400">{t('common.cancel')}</button>
            </li>
          ) : (
            <li key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-slate-700">{item}</span>
              <button
                type="button"
                onClick={() => { setEditingIndex(i); setEditingText(item) }}
                aria-label={`${t('common.edit')}: ${item}`}
                className="text-xs text-slate-400 hover:text-indigo-600"
              >
                {t('common.edit')}
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label={`${t('common.delete')}: ${item}`}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                {t('common.delete')}
              </button>
            </li>
          ),
        )}
      </ul>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">{label}</label>
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder={t(field.placeholder_key ?? field.label_key)}
          className={`flex-1 ${INPUT.replace('w-full ', '')}`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          {t('common.add')}
        </button>
      </div>
    </fieldset>
  )
}
