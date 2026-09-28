import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createChild } from '../lib/db'
import { toUserMessage } from '../lib/errors'
import { BTN_PRIMARY, BTN_SECONDARY } from '../lib/styles'
import { PersonalInfoFields, type PersonalInfoValues } from '../components/profile/PersonalInfoFields'
import { InlineError } from '../components/ui/InlineError'
import { PageHeader } from '../components/ui/PageHeader'

export function AddChildPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [values, setValues] = useState<PersonalInfoValues>({ name: '', dob: '', pronouns: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) return

    setSaving(true)
    setError(null)
    try {
      const child = await createChild({
        name: values.name.trim(),
        dateOfBirth: values.dob || null,
        pronouns: values.pronouns.trim() || null,
      })
      navigate(`/children/${child.id}`)
    } catch (err) {
      setError(toUserMessage(err, t('errors.failedToCreate')))
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('child.newChild')} onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <PersonalInfoFields
          values={values}
          onChange={(field, value) => setValues(v => ({ ...v, [field]: value }))}
          autoFocusName
        />

        <InlineError message={error} size="md" />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className={`flex-1 font-medium ${BTN_SECONDARY}`}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving || !values.name.trim()} className={`flex-1 ${BTN_PRIMARY}`}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
