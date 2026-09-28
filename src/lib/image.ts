// ============================================================
// Client-side photo processing.
//
// Photos are stored as data URLs in personal_info.photo_base64, so size
// matters: every dashboard load and every shared-page view carries them.
// Re-encoding through a canvas also drops all EXIF metadata — including
// the GPS coordinates phones embed, which would otherwise reveal where
// the photo was taken (often the child's home) to anyone with the link.
// ============================================================

/** Longest side of a stored photo, in px. Plenty for the 80px avatar + lightbox. */
export const PHOTO_MAX_SIDE = 512
const PHOTO_QUALITY = 0.8

/**
 * Data URLs longer than this are treated as legacy, un-resized uploads
 * (~150 KB of base64). A resized 512px JPEG is typically 30–60 KB.
 */
export const LEGACY_PHOTO_THRESHOLD = 200_000

/** Largest dimension that fits within maxSide, preserving aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Downscale an image (File/Blob) to PHOTO_MAX_SIDE and re-encode as JPEG,
 * returned as a data URL. JPEG rather than WebP because Safari's canvas
 * can't reliably encode WebP. Modern browsers apply EXIF orientation when
 * decoding, so rotated phone photos come out upright.
 */
export async function resizeImageToDataUrl(source: Blob, maxSide = PHOTO_MAX_SIDE): Promise<string> {
  const bitmap = await createImageBitmap(source)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    // JPEG has no alpha — paint white first so transparent PNGs don't turn black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY)
  } finally {
    bitmap.close()
  }
}

/** Resize an existing data URL (used to shrink legacy full-size photos). */
export async function resizeDataUrl(dataUrl: string, maxSide = PHOTO_MAX_SIDE): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  return resizeImageToDataUrl(blob, maxSide)
}
