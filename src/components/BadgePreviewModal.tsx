import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'

interface BadgePreviewModalProps {
  childName: string
  shareUrl: string
  onClose: () => void
}

// Badge physical dimensions
const BADGE_W_MM = 54
const BADGE_H_MM = 86

// Preview pixel dimensions — these are the canonical sizes everything is
// authored against. Print reproduces them at physical mm, so 1 preview-px
// maps to (54/238) mm ≈ 0.227 mm.
const BADGE_W_PX = 238
const BADGE_H_PX = 380

/**
 * Generates the complete badge as an SVG string.
 * Accepts an optional pre-serialised QR SVG string; if omitted the QR area
 * is left blank (used only as a fallback).
 *
 * Text content (name label, child name, bottom message) is rendered via
 * <foreignObject> + real HTML rather than SVG <text>, so the browser's
 * native text layout/wrapping engine handles it identically to the on-screen
 * preview — regardless of language, script direction, or string length.
 */
function buildBadgeSVG(
  childName: string,
  qrSvgString: string,
  nameLabel: string,
  message: string,
): string {
  // Sunflower petal path helper — 8 ellipses around origin
  function petals(r: number, fill = '#fbbf24', stroke = '#f59e0b'): string {
    const pw = r * 0.38
    const ph = (r * 0.9) / 2
    return Array.from({ length: 8 }, (_, i) => {
      const angle = i * 45
      return `<ellipse cx="0" cy="${-(r * 0.55)}" rx="${pw}" ry="${ph}" fill="${fill}" stroke="${stroke}" stroke-width="0.5" transform="rotate(${angle})"/>`
    }).join('')
  }

  function sunflower(tx: number, ty: number, rot: number, r: number): string {
    return `
      <g transform="translate(${tx},${ty}) rotate(${rot})">
        ${petals(r)}
        <circle cx="0" cy="0" r="${r * 0.41}" fill="#78350f"/>
        <circle cx="0" cy="0" r="${r * 0.23}" fill="#92400e"/>
      </g>`
  }

  // QR block: starts at y=145, QR itself inset 8px
  const qrSize = 110
  const qrX = (BADGE_W_PX - qrSize) / 2   // 64
  const qrY = 153  // white bg rect starts at 145, QR inset 8px

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${BADGE_W_PX}" height="${BADGE_H_PX}" viewBox="0 0 ${BADGE_W_PX} ${BADGE_H_PX}">

  <!-- Warm cream base -->
  <rect width="${BADGE_W_PX}" height="${BADGE_H_PX}" fill="#fffbeb"/>

  <!-- Stems -->
  <line x1="28" y1="60" x2="40" y2="120" stroke="#65a30d" stroke-width="2" stroke-linecap="round"/>
  <line x1="205" y1="73" x2="195" y2="130" stroke="#65a30d" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="208" x2="25" y2="260" stroke="#65a30d" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="222" y1="216" x2="210" y2="265" stroke="#65a30d" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="32" y1="310" x2="45" y2="260" stroke="#65a30d" stroke-width="2" stroke-linecap="round"/>
  <line x1="210" y1="305" x2="200" y2="258" stroke="#65a30d" stroke-width="2" stroke-linecap="round"/>

  <!-- Leaves -->
  <ellipse cx="36" cy="92" rx="7" ry="3.5" fill="#84cc16" transform="rotate(-40 36 92)"/>
  <ellipse cx="198" cy="105" rx="6" ry="3" fill="#84cc16" transform="rotate(35 198 105)"/>
  <ellipse cx="20" cy="238" rx="5" ry="2.5" fill="#84cc16" transform="rotate(-30 20 238)"/>
  <ellipse cx="215" cy="245" rx="5" ry="2.5" fill="#84cc16" transform="rotate(30 215 245)"/>
  <ellipse cx="40" cy="285" rx="6" ry="3" fill="#84cc16" transform="rotate(-45 40 285)"/>
  <ellipse cx="204" cy="282" rx="6" ry="3" fill="#84cc16" transform="rotate(45 204 282)"/>

  <!-- Sunflowers -->
  ${sunflower(28, 38, -15, 22)}
  ${sunflower(205, 55, 20, 18)}
  ${sunflower(14, 195, 5, 13)}
  ${sunflower(222, 200, -10, 16)}
  ${sunflower(20, 332, 12, 16)}
  ${sunflower(218, 328, -8, 16)}
  ${sunflower(119, 18, 0, 11)}
  ${sunflower(119, 370, 5, 10)}

  <!-- Overlay to soften background -->
  <rect width="${BADGE_W_PX}" height="${BADGE_H_PX}" fill="rgba(255,251,235,0.55)"/>

  <!-- Name label + child name — real HTML so text wraps/renders like the preview -->
  <foreignObject x="10" y="70" width="${BADGE_W_PX - 20}" height="60">
    <div xmlns="http://www.w3.org/1999/xhtml" style="
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
    ">
      <p style="
        margin: 0 0 6px 0;
        font-size: 10px; font-weight: 600; letter-spacing: 2px;
        color: #b45309; text-transform: uppercase;
      ">${escapeHtml(nameLabel)}</p>
      <p style="
        margin: 0;
        font-size: 28px; font-weight: 700; line-height: 1.15;
        color: #0f172a; word-break: break-word;
      ">${escapeHtml(childName)}</p>
    </div>
  </foreignObject>

  <!-- QR white background card -->
  <rect x="${qrX - 8}" y="145" width="${qrSize + 16}" height="${qrSize + 16}"
    rx="10" ry="10" fill="white"
    filter="url(#shadow)"/>

  <!-- Drop shadow filter -->
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#00000022"/>
    </filter>
  </defs>

  <!-- Embedded QR SVG -->
  <image x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"
    href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvgString)}"/>

  <!-- Bottom message pill — y=283 to y=353, safely above bottom sunflowers -->
  <rect x="20" y="283" width="${BADGE_W_PX - 40}" height="62"
    rx="8" ry="8" fill="white"/>

  <!-- Bottom message — real HTML, wraps naturally within the pill -->
  <foreignObject x="28" y="291" width="${BADGE_W_PX - 56}" height="46">
    <p xmlns="http://www.w3.org/1999/xhtml" style="
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 9.5px; font-weight: 500; line-height: 1.4;
      color: #1e293b; text-align: center;
    ">${escapeHtml(message)}</p>
  </foreignObject>
</svg>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function BadgePreviewModal({ childName, shareUrl, onClose }: BadgePreviewModalProps) {
  const { t } = useTranslation()
  const qrRef = useRef<HTMLDivElement>(null)

  const nameLabel = t('share.printBadgeNameLabel')
  const message = t('share.printBadgeMessageShort')

  /** Extract the live QR SVG from the DOM, then print via hidden iframe */
  const handlePrint = () => {
    // Grab the rendered QR SVG from the DOM
    const qrSvgEl = qrRef.current?.querySelector('svg')
    let qrSvgString = ''
    if (qrSvgEl) {
      const clone = qrSvgEl.cloneNode(true) as SVGElement
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', '110')
      clone.setAttribute('height', '110')
      qrSvgString = new XMLSerializer().serializeToString(clone)
    }

    const badgeSVG = buildBadgeSVG(childName, qrSvgString, nameLabel, message)

    // Build a minimal HTML document sized exactly to the badge
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${BADGE_W_MM}mm;
    height: ${BADGE_H_MM}mm;
    overflow: hidden;
  }
  @page {
    size: ${BADGE_W_MM}mm ${BADGE_H_MM}mm;
    margin: 0;
  }
  svg {
    display: block;
    width: ${BADGE_W_MM}mm;
    height: ${BADGE_H_MM}mm;
  }
</style>
</head>
<body>
  ${badgeSVG.replace(`width="${BADGE_W_PX}" height="${BADGE_H_PX}"`, `width="${BADGE_W_MM}mm" height="${BADGE_H_MM}mm"`)}
</body>
</html>`

    // Write into a hidden iframe and print from it
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;'
    document.body.appendChild(iframe)
    iframe.contentDocument!.open()
    iframe.contentDocument!.write(html)
    iframe.contentDocument!.close()

    iframe.onload = () => {
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      // Clean up after a short delay to let the print dialog open
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal shell */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{t('share.printBadgePreview')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('share.printBadgeClose')}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Badge preview */}
        <div className="flex items-center justify-center bg-slate-100 py-8 px-4">
          <div
            className="badge-print-area relative overflow-hidden rounded-xl shadow-lg select-none"
            style={{ width: BADGE_W_PX, height: BADGE_H_PX }}
          >
            {/* Background SVG */}
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${BADGE_W_PX} ${BADGE_H_PX}`}
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <rect width={BADGE_W_PX} height={BADGE_H_PX} fill="#fffbeb" />
              <line x1="28" y1="60" x2="40" y2="120" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" />
              <line x1="205" y1="73" x2="195" y2="130" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="208" x2="25" y2="260" stroke="#65a30d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="222" y1="216" x2="210" y2="265" stroke="#65a30d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="32" y1="310" x2="45" y2="260" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" />
              <line x1="210" y1="305" x2="200" y2="258" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="36" cy="92" rx="7" ry="3.5" fill="#84cc16" transform="rotate(-40 36 92)" />
              <ellipse cx="198" cy="105" rx="6" ry="3" fill="#84cc16" transform="rotate(35 198 105)" />
              <ellipse cx="20" cy="238" rx="5" ry="2.5" fill="#84cc16" transform="rotate(-30 20 238)" />
              <ellipse cx="215" cy="245" rx="5" ry="2.5" fill="#84cc16" transform="rotate(30 215 245)" />
              <ellipse cx="40" cy="285" rx="6" ry="3" fill="#84cc16" transform="rotate(-45 40 285)" />
              <ellipse cx="204" cy="282" rx="6" ry="3" fill="#84cc16" transform="rotate(45 204 282)" />
              <SunflowerGroup tx={28}  ty={38}  rot={-15} r={22} />
              <SunflowerGroup tx={205} ty={55}  rot={20}  r={18} />
              <SunflowerGroup tx={14}  ty={195} rot={5}   r={13} />
              <SunflowerGroup tx={222} ty={200} rot={-10} r={16} />
              <SunflowerGroup tx={20}  ty={332} rot={12}  r={16} />
              <SunflowerGroup tx={218} ty={328} rot={-8}  r={16} />
              <SunflowerGroup tx={119} ty={18}  rot={0}   r={11} />
              <SunflowerGroup tx={119} ty={370} rot={5}   r={10} />
              <rect width={BADGE_W_PX} height={BADGE_H_PX} fill="rgba(255,251,235,0.55)" />
            </svg>

            {/* Badge content — positions mirror the SVG text/image positions in buildBadgeSVG */}
            <div className="relative z-10 h-full flex flex-col items-center px-5">
              {/* "Hi, my name is" + child name — top area, matches SVG y=90 / y=122 */}
              <div className="text-center mt-[74px]">
                <p className="text-[10px] font-semibold uppercase tracking-[2px] text-amber-700 mb-1.5">
                  {nameLabel}
                </p>
                <p className="text-[28px] font-bold text-slate-900 leading-tight break-words">
                  {childName}
                </p>
              </div>

              {/* QR — starts at y=145, matches SVG */}
              <div className="mt-[18px] bg-white rounded-xl p-2 shadow-md" ref={qrRef}>
                <QRCodeSVG value={shareUrl} size={110} level="M" includeMargin={false} />
              </div>

              {/* Bottom message pill — matches SVG rect y=283 */}
              <div className="mt-[16px] bg-white rounded-lg px-3 py-2 text-center">
                <p className="text-[9.5px] leading-snug text-slate-800 font-medium">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {t('share.printBadgeClose')}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('share.printBadgePrint')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** SVG sunflower group used in the React preview */
function SunflowerGroup({ tx, ty, rot, r }: { tx: number; ty: number; rot: number; r: number }) {
  return (
    <g transform={`translate(${tx},${ty}) rotate(${rot})`}>
      <Petals r={r} />
      <circle cx="0" cy="0" r={r * 0.41} fill="#78350f" />
      <circle cx="0" cy="0" r={r * 0.23} fill="#92400e" />
    </g>
  )
}

function Petals({ r }: { r: number }) {
  const pw = r * 0.38
  const ph = (r * 0.9) / 2
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={i}
          cx="0"
          cy={-(r * 0.55)}
          rx={pw}
          ry={ph}
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="0.5"
          transform={`rotate(${i * 45})`}
        />
      ))}
    </>
  )
}
