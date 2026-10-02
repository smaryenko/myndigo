import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ageInYears } from '../../lib/age'
import { cx } from '../../lib/cx'
import type { SharedPersonalInfo } from '../../lib/types'
import type { ThemeConfig } from './sharedThemes'

// Badge colours by communication level value; unknown values stay neutral.
const LEVEL_STYLES: Record<string, string> = {
  non_verbal: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200',
  limited_verbal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  verbal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
}

export interface CommunicationLevel {
  value: string
  label: string
}

export function CommunicationBadge({ level, theme }: { level: CommunicationLevel; theme: ThemeConfig }) {
  return (
    <span
      className={cx(
        'inline-block text-xs font-bold px-2.5 py-1',
        theme.commBadgeRadius,
        LEVEL_STYLES[level.value] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
      )}
    >
      {level.label}
    </span>
  )
}

/**
 * Photo thumbnail + click-to-enlarge lightbox. Right-click / drag saving is
 * discouraged (not prevented — screenshots and devtools still work; this is
 * a deterrent, not a security boundary).
 */
function Photo({ src, name, theme }: { src: string; name: string; theme: ThemeConfig }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const close = () => {
    setOpen(false)
    openRef.current?.focus()
  }

  return (
    <>
      <button
        ref={openRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cx('w-20 h-20 overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-400 select-none', theme.photoRadius)}
        aria-label={t('sharedPage.viewPhoto')}
        onContextMenu={e => e.preventDefault()}
      >
        <img src={src} alt={name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-50">
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="w-full h-full bg-black/80 flex items-center justify-center p-4 select-none"
            aria-label={t('sharedPage.closePhoto')}
            onContextMenu={e => e.preventDefault()}
          >
            <img src={src} alt={name} className="max-w-full max-h-full rounded-lg object-contain shadow-2xl pointer-events-none" draggable={false} />
          </button>
        </div>
      )}
    </>
  )
}

interface Props {
  personalInfo: SharedPersonalInfo
  level: CommunicationLevel | null
  theme: ThemeConfig
}

/** Photo, name, age, "responds to" and communication level. */
export function IdentityCard({ personalInfo, level, theme }: Props) {
  const { t } = useTranslation()
  const age = ageInYears(personalInfo.date_of_birth)

  return (
    <section aria-label={personalInfo.name} className={cx('mx-4 px-4 py-4 flex items-center gap-4 mb-2', theme.card)}>
      {personalInfo.photo_base64 ? (
        <Photo src={personalInfo.photo_base64} name={personalInfo.name} theme={theme} />
      ) : (
        <div className={cx('w-20 h-20 flex items-center justify-center flex-shrink-0', theme.photoRadius, theme.photoPlaceholder)} aria-hidden="true">
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-slate-50">
          {personalInfo.name}
          {age !== null && <span className="font-normal text-slate-500 dark:text-slate-400">, {age}</span>}
        </h1>
        {personalInfo.pronouns && (
          <p className="text-sm text-slate-600 mt-0.5 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">{t('child.personalInfo.pronouns')}:</span> {personalInfo.pronouns}
          </p>
        )}
        {level && (
          <div className="mt-2">
            <CommunicationBadge level={level} theme={theme} />
          </div>
        )}
      </div>
    </section>
  )
}
