import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from './SectionCard'
import { PersonalInfoFields, type PersonalInfoValues } from './PersonalInfoFields'
import { SaveButton } from '../ui/SaveButton'
import { InlineError } from '../ui/InlineError'
import { useSaveState } from '../../hooks/useSaveState'
import { upsertPersonalInfo } from '../../lib/db'
import { toUserMessage } from '../../lib/errors'
import { LEGACY_PHOTO_THRESHOLD, resizeDataUrl, resizeImageToDataUrl } from '../../lib/image'
import { MAX_PHOTO_BYTES } from '../../lib/constants'
import { cx } from '../../lib/cx'
import type { PersonalInfoRow } from '../../lib/types'

interface Props {
  childId: string
  data: PersonalInfoRow | null
  onChange: (data: PersonalInfoRow) => void
}

export function PersonalInfoSection({ childId, data, onChange }: Props) {
  const { t } = useTranslation()
  const [values, setValues] = useState<PersonalInfoValues>({
    name: data?.name ?? '',
    dob: data?.date_of_birth ?? '',
    pronouns: data?.pronouns ?? '',
  })
  const [photo, setPhoto] = useState<string | null>(data?.photo_base64 ?? null)
  const [photoVisible, setPhotoVisible] = useState(data?.photo_visible ?? true)
  const [sectionVisible, setSectionVisible] = useState(data?.section_visible ?? true)
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { saving, saved, error: saveError, executeSave } = useSaveState()
  const fileRef = useRef<HTMLInputElement>(null)

  // Photos uploaded before client-side resizing can be ~2.7 MB of base64
  // (and still carry EXIF/GPS). Shrink them once, silently, the first time
  // the parent opens the editor — no action needed from them.
  const legacyPhoto = data?.photo_base64 && data.photo_base64.length > LEGACY_PHOTO_THRESHOLD ? data.photo_base64 : null
  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => { onChangeRef.current = onChange })
  useEffect(() => {
    if (!legacyPhoto) return
    let cancelled = false
    resizeDataUrl(legacyPhoto)
      .then(async resized => {
        if (cancelled) return
        const row = await upsertPersonalInfo(childId, { photo_base64: resized })
        if (cancelled) return
        setPhoto(p => (p === legacyPhoto ? resized : p))
        onChangeRef.current(row)
      })
      .catch(err => console.error('Legacy photo resize failed:', err))
    return () => { cancelled = true }
  }, [childId, legacyPhoto])

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setActionError(null)
    if (file.size > MAX_PHOTO_BYTES) {
      setActionError(t('errors.photoTooLarge'))
      return
    }
    setProcessingPhoto(true)
    try {
      setPhoto(await resizeImageToDataUrl(file))
    } catch (err) {
      setActionError(toUserMessage(err, t('errors.photoUnreadable')))
    } finally {
      setProcessingPhoto(false)
    }
  }

  /** Optimistic visibility toggle with rollback on failure. */
  const saveFlag = async (key: 'photo_visible' | 'section_visible', next: boolean) => {
    const apply = key === 'photo_visible' ? setPhotoVisible : setSectionVisible
    const previous = key === 'photo_visible' ? photoVisible : sectionVisible
    setActionError(null)
    apply(next)
    try {
      onChange(await upsertPersonalInfo(childId, { [key]: next }))
    } catch (err) {
      apply(previous)
      setActionError(toUserMessage(err, t('common.saveFailed')))
    }
  }

  const handleSave = () =>
    executeSave(async () => {
      const row = await upsertPersonalInfo(childId, {
        name: values.name.trim(),
        date_of_birth: values.dob || null,
        pronouns: values.pronouns.trim() || null,
        photo_base64: photo,
        photo_visible: photoVisible,
      })
      onChange(row)
    })

  const photoButtonLabel = photo ? t('child.personalInfo.changePhoto') : t('child.personalInfo.addPhoto')

  return (
    <SectionCard
      title={t('child.sections.personalInfo')}
      visible={sectionVisible}
      onVisibilityChange={v => saveFlag('section_visible', v)}
    >
      <div className="space-y-4">
        <InlineError message={actionError} />

        {/* Photo */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={photoButtonLabel}
            className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl" aria-hidden="true">📷</span>
            )}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={processingPhoto}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline disabled:opacity-50"
              >
                {processingPhoto ? t('common.loading') : photoButtonLabel}
              </button>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="text-sm text-red-400 dark:text-red-400 hover:underline">
                  {t('child.personalInfo.removePhoto')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('child.personalInfo.photoHint')}</p>
            {photo && (
              <button
                type="button"
                aria-pressed={photoVisible}
                onClick={() => saveFlag('photo_visible', !photoVisible)}
                className={cx(
                  'mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
                  photoVisible ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400',
                )}
              >
                <span aria-hidden="true">{photoVisible ? '👁' : '🙈'}</span>
                {photoVisible ? t('child.personalInfo.photoVisible') : t('child.personalInfo.photoHidden')}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handlePhotoChange}
          />
        </div>

        <PersonalInfoFields values={values} onChange={(field, value) => setValues(v => ({ ...v, [field]: value }))} />

        <InlineError message={saveError} />

        <SaveButton saving={saving} saved={saved} disabled={!values.name.trim() || processingPhoto} onClick={handleSave} />
      </div>
    </SectionCard>
  )
}
