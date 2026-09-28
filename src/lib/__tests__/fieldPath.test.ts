import { describe, expect, it } from 'vitest'
import { collectTranslatableTexts, fieldPath } from '../../../supabase/functions/_shared/fieldPath.ts'

describe('fieldPath', () => {
  it('uses {section}.{entry}.{field} for every section', () => {
    expect(fieldPath('triggers', 'e1', 'trigger_text')).toBe('triggers.e1.trigger_text')
    expect(fieldPath('behavioral_notes', 'e2', 'content')).toBe('behavioral_notes.e2.content')
  })

  it('appends the index for list items', () => {
    expect(fieldPath('communication', 'e3', 'instructions', 0)).toBe('communication.e3.instructions.0')
  })
})

describe('collectTranslatableTexts', () => {
  const keys = new Map([
    ['triggers', new Set(['trigger_text', 'de_escalation'])],
    ['communication', new Set(['instructions'])],
  ])

  it('collects only translatable, non-empty, non-hidden values', () => {
    const out = collectTranslatableTexts(
      [
        { id: 't1', section_key: 'triggers', hidden_fields: ['de_escalation'], values: { trigger_text: 'Loud noises', de_escalation: 'secret', other: 'x' } },
        { id: 't2', section_key: 'triggers', values: { trigger_text: '   ', de_escalation: 'Quiet room' } },
        { id: 'm1', section_key: 'medications', values: { name: 'Not translatable section' } },
      ],
      keys,
    )
    expect(out).toEqual({
      'triggers.t1.trigger_text': 'Loud noises',
      'triggers.t2.de_escalation': 'Quiet room',
    })
  })

  it('keeps raw array indexes for list items, skipping empty ones', () => {
    const out = collectTranslatableTexts(
      [{ id: 'c1', section_key: 'communication', values: { instructions: ['Speak slowly', '', 'Use pictures'] } }],
      keys,
    )
    expect(out).toEqual({
      'communication.c1.instructions.0': 'Speak slowly',
      'communication.c1.instructions.2': 'Use pictures',
    })
  })
})
