import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createChild, upsertPersonalInfo } from '../lib/db'

export function AddChildPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const child = await createChild()
      await upsertPersonalInfo(child.id, {
        name: name.trim(),
        date_of_birth: dob || null,
        pronouns: pronouns.trim() || null,
      })
      navigate(`/children/${child.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCreate'))
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1"
      >
        ← {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('child.newChild')}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.name')} <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('child.personalInfo.namePlaceholder')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Date of birth */}
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.dateOfBirth')}
          </label>
          <input
            id="dob"
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Pronouns */}
        <div>
          <label htmlFor="pronouns" className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.pronouns')}
          </label>
          <input
            id="pronouns"
            type="text"
            value={pronouns}
            onChange={e => setPronouns(e.target.value)}
            placeholder={t('child.personalInfo.pronounsPlaceholder')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm" role="alert">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
