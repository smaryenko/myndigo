import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { buildSectionViews, fieldListItems, fieldText, groupSections, sortAlerts, type Tx } from '../sharedModel'
import type { SharedProfile, SharedSection } from '../../../lib/types'

const t = ((key: string) => key) as unknown as TFunction

const section = (section_key: string, sort_order: number, extra: Partial<SharedSection> = {}): SharedSection => ({
  section_key,
  label_key: `child.sections.${section_key}`,
  share_label_key: null,
  share_group_label_key: null,
  repeatable: true,
  render_hint: 'list',
  sort_order,
  fields: [
    { field_key: 'name', label_key: 'l.name', field_type: 'text', options: null, translatable: true, sort_order: 10 },
    { field_key: 'items', label_key: 'l.items', field_type: 'text_list', options: null, translatable: true, sort_order: 20 },
  ],
  ...extra,
})

const profile = (sections: SharedSection[], entries: SharedProfile['entries']): SharedProfile => ({
  child: { id: 'c', share_language: 'en', share_theme: 'professional', profile_type: 'asd_child' },
  personalInfo: null,
  sections,
  entries,
})

describe('buildSectionViews', () => {
  it('orders sections and entries, dropping empty entries and sections', () => {
    const views = buildSectionViews(
      profile(
        [section('b', 20), section('a', 10), section('empty', 30)],
        [
          { id: 'b2', section_key: 'b', sort_order: 2, values: { name: 'B2' } },
          { id: 'b1', section_key: 'b', sort_order: 1, values: { name: 'B1' } },
          { id: 'a1', section_key: 'a', sort_order: 0, values: { name: 'A1' } },
          { id: 'e1', section_key: 'empty', sort_order: 0, values: { name: '  ', items: [] } },
        ],
      ),
      t,
    )
    expect(views.map(v => v.section.section_key)).toEqual(['a', 'b'])
    expect(views[1].entries.map(e => e.id)).toEqual(['b1', 'b2'])
  })
})

describe('translation lookup', () => {
  const s = section('triggers', 0)
  const entry = { id: 'e1', section_key: 'triggers', sort_order: 0, values: { name: 'Loud', items: ['one', '', 'three'] } }
  const translations: Record<string, string> = {
    'triggers.e1.name': 'Laut',
    'triggers.e1.items.2': 'drei',
  }
  const tx: Tx = (path, original) => translations[path] ?? original

  it('translates scalar fields by fieldPath', () => {
    expect(fieldText(s, s.fields[0], entry, t, tx)).toBe('Laut')
  })

  it('translates list items by their raw index', () => {
    expect(fieldListItems(s, s.fields[1], entry, tx)).toEqual(['one', 'drei'])
  })
})

describe('groupSections', () => {
  it('groups sections sharing a group key at the first member position', () => {
    const views = [
      { section: section('sensory', 1), entries: [] },
      { section: section('medications', 2, { share_group_label_key: 'medical' }), entries: [] },
      { section: section('routines', 3), entries: [] },
      { section: section('doctors', 4, { share_group_label_key: 'medical' }), entries: [] },
    ]
    const blocks = groupSections(views)
    expect(blocks.map(b => (b.kind === 'group' ? `group:${b.views.map(v => v.section.section_key).join('+')}` : b.view.section.section_key)))
      .toEqual(['sensory', 'group:medications+doctors', 'routines'])
  })
})

describe('sortAlerts', () => {
  it('puts red alerts first and keeps the parent order otherwise', () => {
    const sorted = sortAlerts([
      { id: '1', section_key: 'alerts', sort_order: 0, values: { alert_type: 'asthma' } },
      { id: '2', section_key: 'alerts', sort_order: 1, values: { alert_type: 'food_allergy' } },
      { id: '3', section_key: 'alerts', sort_order: 2, values: { alert_type: 'diabetes' } },
      { id: '4', section_key: 'alerts', sort_order: 3, values: { alert_type: 'custom', severity: 'red' } },
    ])
    expect(sorted.map(a => a.id)).toEqual(['2', '4', '1', '3'])
  })
})
