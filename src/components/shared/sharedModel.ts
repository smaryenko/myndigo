// ============================================================
// Shared-page view model: turns the get_shared_profile() payload into
// per-section views and resolves display text for any field — with
// content translation applied uniformly to every translatable field, using
// the same fieldPath() the translate Edge Function caches under.
// ============================================================

import type { TFunction } from 'i18next'
import { fieldPath } from '../../lib/fieldPath'
import { formatFieldValue, isDisplayable } from '../../lib/fieldFormat'
import { alertSeverity } from '../../lib/alerts'
import type { SharedField, SharedProfile, SharedProfileEntry, SharedSection } from '../../lib/types'

/** Looks up a content translation, falling back to the original text. */
export type Tx = (path: string, original: string) => string

export interface SectionView {
  section: SharedSection
  entries: SharedProfileEntry[]
}

/**
 * Sections in sort order with their entries (sort order), dropping entries
 * with nothing to show and sections left with no entries.
 */
export function buildSectionViews(profile: SharedProfile, t: TFunction): SectionView[] {
  const bySection = new Map<string, SharedProfileEntry[]>()
  for (const entry of profile.entries) {
    const list = bySection.get(entry.section_key) ?? []
    list.push(entry)
    bySection.set(entry.section_key, list)
  }
  return [...profile.sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(section => ({
      section,
      entries: (bySection.get(section.section_key) ?? [])
        .filter(entry => entryHasContent(section, entry, t))
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter(view => view.entries.length > 0)
}

function entryHasContent(section: SharedSection, entry: SharedProfileEntry, t: TFunction): boolean {
  return section.fields.some(f =>
    f.field_type === 'text_list'
      ? rawListItems(entry, f).length > 0
      : isDisplayable(f) && formatFieldValue(f, entry.values[f.field_key], t) !== null,
  )
}

/** Display text for a scalar field, translated when the field is translatable. */
export function fieldText(
  section: SharedSection,
  field: SharedField,
  entry: SharedProfileEntry,
  t: TFunction,
  tx: Tx,
): string | null {
  const raw = entry.values[field.field_key]
  const isText = field.field_type === 'text' || field.field_type === 'longtext'
  if (isText && field.translatable && typeof raw === 'string' && raw.trim()) {
    return tx(fieldPath(section.section_key, entry.id, field.field_key), raw)
  }
  return formatFieldValue(field, raw, t)
}

/**
 * Items of a text_list field, translated when translatable. Indexes are the
 * raw array positions (matching the server's field paths), even if some
 * items are empty and skipped.
 */
export function fieldListItems(section: SharedSection, field: SharedField, entry: SharedProfileEntry, tx: Tx): string[] {
  return rawListItems(entry, field).map(({ text, index }) =>
    field.translatable ? tx(fieldPath(section.section_key, entry.id, field.field_key, index), text) : text,
  )
}

function rawListItems(entry: SharedProfileEntry, field: SharedField): { text: string; index: number }[] {
  const raw = entry.values[field.field_key]
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => (typeof item === 'string' && item.trim() ? [{ text: item, index }] : []))
}

/** Red-severity alerts first, otherwise in the parent's order. */
export function sortAlerts(entries: SharedProfileEntry[]): SharedProfileEntry[] {
  const rank = (e: SharedProfileEntry) => (alertSeverity(e.values) === 'red' ? 0 : 1)
  return [...entries].sort((a, b) => rank(a) - rank(b))
}

/** Title for a section on the shared page. */
export function sectionTitle(section: SharedSection, t: TFunction): string {
  return t(section.share_label_key ?? section.label_key)
}

/**
 * Groups consecutive-or-not sections sharing a share_group_label_key into
 * one block, positioned where the group's first section appears.
 */
export type SectionBlock =
  | { kind: 'single'; view: SectionView }
  | { kind: 'group'; labelKey: string; views: SectionView[] }

export function groupSections(views: SectionView[]): SectionBlock[] {
  const blocks: SectionBlock[] = []
  const groups = new Map<string, { kind: 'group'; labelKey: string; views: SectionView[] }>()
  for (const view of views) {
    const key = view.section.share_group_label_key
    if (!key) {
      blocks.push({ kind: 'single', view })
      continue
    }
    const existing = groups.get(key)
    if (existing) {
      existing.views.push(view)
    } else {
      const group = { kind: 'group' as const, labelKey: key, views: [view] }
      groups.set(key, group)
      blocks.push(group)
    }
  }
  return blocks
}

/**
 * Lines for the "Talk to me" card (communication section). `badgeFieldKey`
 * is shown as the identity badge instead, so it is skipped here.
 */
export function talkToMeLines(
  section: SharedSection,
  entry: SharedProfileEntry,
  badgeFieldKey: string | null,
  t: TFunction,
  tx: Tx,
): string[] {
  const values = entry.values
  const lines: string[] = []
  for (const field of section.fields.filter(isDisplayable)) {
    if (field.field_key === badgeFieldKey) continue
    // Friendlier phrasing for the two well-known ASD communication flags;
    // any other field falls through to generic rendering below.
    if (field.field_key === 'uses_aac') {
      if (values.uses_aac === true) {
        const device = typeof values.aac_device === 'string' && values.aac_device.trim() ? values.aac_device.trim() : null
        lines.push(device ? t('sharedPage.usesAacDevice', { device }) : t('sharedPage.usesAac'))
      }
      continue
    }
    if (field.field_key === 'aac_device') continue // folded into uses_aac above
    if (field.field_key === 'echolalia') {
      if (values.echolalia === true) lines.push(t('sharedPage.echolalia'))
      continue
    }
    if (field.field_type === 'text_list') {
      lines.push(...fieldListItems(section, field, entry, tx))
      continue
    }
    const text = fieldText(section, field, entry, t, tx)
    if (text === null) continue
    lines.push(field.field_type === 'boolean' ? text : `${t(field.label_key)}: ${text}`)
  }
  return lines
}
