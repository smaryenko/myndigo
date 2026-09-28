import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGS } from '../lib/languages'
import { currentLanguage, setLanguage } from '../lib/i18n'
import { cx } from '../lib/cx'
import { SELECT_XS } from '../lib/styles'

interface Props {
  className?: string
}

/** Compact UI-language select for the nav bars. The choice is remembered on this device. */
export function LanguageSelector({ className }: Props) {
  const { t } = useTranslation() // re-render on language change

  return (
    <select
      value={currentLanguage()}
      onChange={e => void setLanguage(e.target.value, { persist: true })}
      className={cx(SELECT_XS, className)}
      aria-label={t('common.selectLanguage')}
    >
      {SUPPORTED_LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.short} — {l.label}</option>
      ))}
    </select>
  )
}
