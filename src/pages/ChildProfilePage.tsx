import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChildProfile, deleteChild } from '../lib/db'
import type { ChildProfile, ProfileEntryRow } from '../lib/types'
import { PersonalInfoSection } from '../components/profile/PersonalInfoSection'
import { DynamicSection } from '../components/profile/DynamicSection'
import { DangerZone } from '../components/ui/DangerZone'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { PageHeader } from '../components/ui/PageHeader'

export function ChildProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    if (!id) return
    getChildProfile(id)
      .then(setProfile)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteChild(id)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.deleteFailed'))
      setDeleting(false)
    }
  }

  const handleEntriesChange = (sectionKey: string, entries: ProfileEntryRow[]) => {
    setProfile(p => {
      if (!p) return p
      const others = p.entries.filter(e => e.section_key !== sectionKey)
      return { ...p, entries: [...others, ...entries] }
    })
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !profile) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-sm">{error ?? t('errors.profileNotFound')}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="mt-4 text-indigo-600 text-sm hover:underline">
          {t('errors.backToDashboard')}
        </button>
      </div>
    )
  }

  const childName = profile.personalInfo?.name || t('errors.childProfile')

  return (
    <div>
      <PageHeader
        title={childName}
        onBack={() => navigate('/dashboard')}
        action={
          <Link
            to={`/children/${id}/share`}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${profile.child.sharing_enabled ? 'bg-green-500' : 'bg-slate-400'}`} />
            🔗 {t('share.title')}
          </Link>
        }
      />

      {/* Sections */}
      <div className="space-y-3">
        <PersonalInfoSection
          childId={profile.child.id}
          data={profile.personalInfo}
          onChange={personalInfo => setProfile(p => p ? { ...p, personalInfo } : p)}
        />

        {profile.sections.map(section => (
          <DynamicSection
            key={section.id}
            childId={profile.child.id}
            section={section}
            fields={profile.fieldsBySection[section.section_key] ?? []}
            entries={profile.entries.filter(e => e.section_key === section.section_key)}
            onChange={entries => handleEntriesChange(section.section_key, entries)}
          />
        ))}
      </div>

      <DangerZone
        className="mt-8"
        label={t('child.dangerZone')}
        actionLabel={t('child.deleteProfile')}
        description={t('child.deleteConfirm', { name: childName })}
        confirmLabel={t('child.deleteConfirmButton')}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
