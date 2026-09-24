import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from './SectionCard'
import { upsertPersonalInfo } from '../../lib/db'
import { MAX_PHOTO_BYTES } from '../../lib/constants'
import { INPUT } from '../../lib/cn'
import { SaveButton } from '../ui/SaveButton'
import { useSaveState } from '../../hooks/useSaveState'
import type { PersonalInfoRow } from '../../lib/types'

interface Props {
  childId: string
  data: PersonalInfoRow | null
  onChange: (data: PersonalInfoRow) => void
}

export function PersonalInfoSection({ childId, data, onChange }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(data?.name ?? '')
  const [dob, setDob] = useState(data?.date_of_birth ?? '')
  const [pronouns, setPronouns] = useState(data?.pronouns ?? '')
  const [photo, setPhoto] = useState<string | null>(data?.photo_base64 ?? null)
  const [photoVisible, setPhotoVisible] = useState(data?.photo_visible ?? true)
  const { saving, saved, executeSave } = useSaveState()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t('errors.photoTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handlePhotoVisibleToggle = async () => {
    if (!data?.id) return
    const next = !photoVisible
    setPhotoVisible(next)
    await upsertPersonalInfo(childId, { photo_visible: next })
    onChange({ ...(data as PersonalInfoRow), photo_visible: next })
  }

  const handleSave = async () => {
    setError(null)
    await executeSave(async () => {
      await upsertPersonalInfo(childId, {
        name: name.trim(),
        date_of_birth: dob || null,
        pronouns: pronouns.trim() || null,
        photo_base64: photo,
        photo_visible: photoVisible,
      })
      onChange({ ...(data as PersonalInfoRow), name, date_of_birth: dob || null, pronouns: pronouns || null, photo_base64: photo, photo_visible: photoVisible })
    })
  }

  const handleVisibility = async (visible: boolean) => {
    if (!data?.id) return
    await upsertPersonalInfo(childId, { section_visible: visible })
    onChange({ ...(data as PersonalInfoRow), section_visible: visible })
  }

  return (
    <SectionCard
      title={t('child.sections.personalInfo')}
      visible={data?.section_visible ?? true}
      onVisibilityChange={handleVisibility}
    >
      <div className="space-y-4">
        {/* Photo */}
        <div className="flex items-start gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {photo ? (
              <img src={photo} alt={t('common.photoAlt')} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">📷</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                {photo ? t('child.personalInfo.changePhoto') : t('child.personalInfo.addPhoto')}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-sm text-red-400 hover:underline"
                >
                  {t('child.personalInfo.removePhoto')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t('child.personalInfo.photoHint')}</p>
            {/* Photo visibility toggle */}
            {photo && (
              <button
                type="button"
                onClick={handlePhotoVisibleToggle}
                className={`mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  photoVisible
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <span>{photoVisible ? '👁' : '🙈'}</span>
                {photoVisible ? t('child.personalInfo.photoVisible') : t('child.personalInfo.photoHidden')}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={INPUT}
          />
        </div>

        {/* Date of birth */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.dateOfBirth')}
          </label>
          <input
            type="date"
            value={dob ?? ''}
            onChange={e => setDob(e.target.value)}
            className={INPUT}
          />
        </div>

        {/* Responds to */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('child.personalInfo.pronouns')}
          </label>
          <input
            type="text"
            value={pronouns ?? ''}
            onChange={e => setPronouns(e.target.value)}
            placeholder={t('child.personalInfo.pronounsPlaceholder')}
            className={INPUT}
          />
        </div>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

        <SaveButton saving={saving} saved={saved} disabled={!name.trim()} onClick={handleSave} />
      </div>
    </SectionCard>
  )
}
