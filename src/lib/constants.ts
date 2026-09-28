// ── Timing ────────────────────────────────────────────────────────────────────
/** How long the "✓ Saved" flash message is shown after a successful save */
export const SAVED_FLASH_MS = 2000

// ── Pagination ────────────────────────────────────────────────────────────────
/** Default page size for audit log and other paginated lists */
export const AUDIT_PAGE_SIZE = 10

// ── Validation ────────────────────────────────────────────────────────────────
/**
 * Maximum size of the photo file a parent picks (20 MB). It's resized to
 * ~50 KB in the browser before saving (see lib/image.ts), so this only
 * guards against decoding absurdly large files on low-memory phones.
 */
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024
