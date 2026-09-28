import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { INPUT, LABEL } from '../../lib/styles'

export interface PersonalInfoValues {
  name: string
  dob: string
  pronouns: string
}

interface Props {
  values: PersonalInfoValues
  onChange: (field: keyof PersonalInfoValues, value: string) => void
  autoFocusName?: boolean
}

/** Name / date of birth / "responds to" inputs — shared by AddChildPage and PersonalInfoSection. */
export function PersonalInfoFields({ values, onChange, autoFocusName }: Props) {
  const { t } = useTranslation()
  const id = useId()

  return (
    <>
      <div>
        <label htmlFor={`${id}-name`} className={LABEL}>
          {t('child.personalInfo.name')} <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-name`}
          type="text"
          required
          aria-required="true"
          value={values.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder={t('child.personalInfo.namePlaceholder')}
          autoFocus={autoFocusName}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${id}-dob`} className={LABEL}>{t('child.personalInfo.dateOfBirth')}</label>
        <input
          id={`${id}-dob`}
          type="date"
          value={values.dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={e => onChange('dob', e.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${id}-pronouns`} className={LABEL}>{t('child.personalInfo.pronouns')}</label>
        <input
          id={`${id}-pronouns`}
          type="text"
          value={values.pronouns}
          onChange={e => onChange('pronouns', e.target.value)}
          placeholder={t('child.personalInfo.pronounsPlaceholder')}
          className={INPUT}
        />
      </div>
    </>
  )
}
