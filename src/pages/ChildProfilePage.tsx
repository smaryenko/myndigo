import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChildProfile, deleteChild } from '../lib/db'
import { toUserMessage, userMessage } from '../lib/errors'
import { cx } from '../lib/cx'
import { useAsync } from '../hooks/useAsync'
import type { ProfileEntryRow } from '../lib/types'
import { PersonalInfoSection } from '../components/profile/PersonalInfoSection'
import { DynamicSection } from '../components/profile/DynamicSection'
import { DangerZone } from '../components/ui/DangerZone'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { PageHeader } from '../components/ui/PageHeader'

/**
 * Route wrapper: keys the page by child id so navigating from one child to
 * another remounts every section (their form state is initialised from props
 * once) instead of carrying the previous child's unsaved values across.
 */
export function ChildProfileRoute() {
  const { id } = useParams<{ id: string }>()
  return <ChildProfilePage key={id} childId={id ?? ''} />
}

function ChildProfilePage({ childId }: { childId: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: profile, setData: setProfile, loading, error } = useAsync(
    childId ? () => getChildProfile(childId) : null,
    childId,
  )
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteChild(childId)
      navigate('/dashboard')
    } catch (err) {
      setDeleteError(toUserMessage(err, t('common.deleteFailed')))
      setDeleting(false)
    }
  }

  const handleEntriesChange = (sectionKey: string, entries: ProfileEntryRow[]) => {
    setProfile(p => p && { ...p, entries: [...p.entries.filter(e => e.section_key !== sectionKey), ...entries] })
  }

  if (loading) return <LoadingSpinner />

  if (error || !profile) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">{userMessage(error, t('errors.profileNotFound'))}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
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
            to={`/children/${childId}/share`}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-300"
          >
            <span
              className={cx('w-2 h-2 rounded-full flex-shrink-0', profile.child.sharing_enabled ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-500')}
              aria-hidden="true"
            />
            <span aria-hidden="true">🔗</span> {t('share.title')}
            <span className="sr-only">
              ({profile.child.sharing_enabled ? t('share.sharingOn') : t('share.sharingOff')})
            </span>
          </Link>
        }
      />

      <div className="space-y-3">
        <PersonalInfoSection
          childId={profile.child.id}
          data={profile.personalInfo}
          onChange={personalInfo => setProfile(p => p && { ...p, personalInfo })}
        />

        {profile.sections.map(section => (
          <DynamicSection
            key={section.id}
            childId={profile.child.id}
            section={section}
            fields={profile.fieldsBySection[section.section_key] ?? []}
            entries={profile.entries.filter(e => e.section_key === section.section_key)}
            onChange={entries => handleEntriesChange(section.section_key, entries)}
            hiddenEmptySections={profile.child.hidden_empty_sections}
            onHiddenEmptySectionsChange={next =>
              setProfile(p => p && { ...p, child: { ...p.child, hidden_empty_sections: next } })
            }
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
        error={deleteError}
      />
    </div>
  )
}
