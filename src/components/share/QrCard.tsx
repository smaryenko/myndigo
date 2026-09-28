import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { SettingsCard } from '../ui/SettingsCard'
import { InlineError } from '../ui/InlineError'
import { BadgePreviewModal } from '../BadgePreviewModal'
import { cx } from '../../lib/cx'

interface Props {
  shareUrl: string
  childName: string
  sharingEnabled: boolean
}

/** Downloads the on-screen QR code as a self-contained 512px SVG with a white background. */
function downloadQrSvg(container: HTMLElement | null, fileName: string) {
  const svgEl = container?.querySelector('svg')
  if (!svgEl) return
  const size = 512
  const clone = svgEl.cloneNode(true) as SVGElement
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%')
  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', 'white')
  clone.insertBefore(bg, clone.firstChild)

  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** QR code, copy/open link, download and print-badge actions. */
export function QrCard({ shareUrl, childName, sharingEnabled }: Props) {
  const { t } = useTranslation()
  const qrRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const handleCopy = async () => {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Clipboard API can be unavailable or denied — select the link so the
      // parent can copy it by hand.
      console.error('Copy failed:', err)
      linkRef.current?.select()
      setCopyError(t('share.copyFailed'))
    }
  }

  const fileSlug = childName.trim().replace(/\s+/g, '-').toLowerCase() || 'profile'

  return (
    <SettingsCard title={t('share.qrCode')} className="mb-4">
      <div className="flex flex-col items-center gap-4">
        <div ref={qrRef} className={cx('p-4 rounded-2xl border-2', sharingEnabled ? 'border-indigo-100' : 'border-slate-100 opacity-50')}>
          <QRCodeSVG value={shareUrl} size={180} level="M" marginSize={0} title={t('share.qrCode')} />
        </div>
        {!sharingEnabled && <p className="text-xs text-amber-600 text-center">{t('share.qrInactiveHint')}</p>}

        <div className="w-full flex flex-wrap gap-2">
          <input
            ref={linkRef}
            type="text"
            readOnly
            value={shareUrl}
            aria-label={t('share.shareLink')}
            dir="ltr"
            onFocus={e => e.target.select()}
            className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 bg-slate-50 focus:outline-none"
          />
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0"
            aria-label={t('share.openInNewTab')}
            title={t('share.openInNewTab')}
          >
            <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 min-w-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-colors text-center"
          >
            <span aria-live="polite">{copied ? t('share.linkCopied') : t('share.copyLink')}</span>
          </button>
        </div>
        <InlineError message={copyError} className="w-full" />

        <button
          type="button"
          onClick={() => downloadQrSvg(qrRef.current, `myndigo-qr-${fileSlug}.svg`)}
          className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('share.downloadQr')}
        </button>

        <button
          type="button"
          onClick={() => setBadgeOpen(true)}
          className="w-full flex items-center justify-center gap-2 text-sm text-amber-700 border border-amber-200 bg-amber-50 rounded-xl py-2 hover:bg-amber-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h4m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t('share.printBadge')}
        </button>
      </div>

      {badgeOpen && <BadgePreviewModal childName={childName} shareUrl={shareUrl} onClose={() => setBadgeOpen(false)} />}
    </SettingsCard>
  )
}
