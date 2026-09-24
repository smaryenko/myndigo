import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGS } from '../lib/languages'
import { loadLanguage } from '../lib/i18n'

interface Props {
  className?: string
}

export function LanguageSelector({ className = '' }: Props) {
  const { i18n, t } = useTranslation()
  const currentCode = i18n.language.split('-')[0]

  const handleChange = async (code: string) => {
    await loadLanguage(code)
    i18n.changeLanguage(code)
  }

  return (
    <select
      value={currentCode}
      onChange={e => handleChange(e.target.value)}
      className={`appearance-none text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-6 text-slate-600 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.25rem_center] focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
      aria-label={t('common.selectLanguage')}
    >
      {SUPPORTED_LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.short} — {l.label}</option>
      ))}
    </select>
  )
}
