import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '../components/ThemeToggle'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-white dark:bg-slate-950">
      <ThemeToggle className="fixed top-4 end-4" />
      <p className="text-6xl mb-4">🔍</p>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('notFound.title')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">{t('notFound.hint')}</p>
      <Link to="/dashboard" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
        {t('notFound.goToDashboard')}
      </Link>
    </div>
  )
}
