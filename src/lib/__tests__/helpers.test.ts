import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { UserFacingError, authError, userMessage } from '../errors'
import { fitWithin } from '../image'
import { contactFieldRoles, formatFieldValue } from '../fieldFormat'
import { alertLabel, alertSeverity } from '../alerts'
import type { FieldOption, FieldType } from '../types'

const t = ((key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key)) as unknown as TFunction

const field = (field_key: string, field_type: FieldType, options: FieldOption[] | null = null) => ({
  field_key,
  label_key: `label.${field_key}`,
  field_type,
  options,
})

describe('errors', () => {
  it('shows only user-facing messages, otherwise the fallback', () => {
    expect(userMessage(new UserFacingError('Invalid login credentials'), 'fallback')).toBe('Invalid login credentials')
    expect(userMessage(new Error('relation "children" does not exist'), 'fallback')).toBe('fallback')
    expect(userMessage({ message: 'raw postgrest' }, 'fallback')).toBe('fallback')
  })

  it('scrubs JWTs from auth error messages', () => {
    const err = authError('bad token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123 here')
    expect(err.message).not.toContain('eyJ')
  })
})

describe('fitWithin', () => {
  it('scales the longest side down to maxSide, preserving aspect ratio', () => {
    expect(fitWithin(4000, 3000, 512)).toEqual({ width: 512, height: 384 })
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512 })
  })

  it('never upscales', () => {
    expect(fitWithin(200, 100, 512)).toEqual({ width: 200, height: 100 })
  })
})

describe('formatFieldValue', () => {
  it('uses the translated option label for selects', () => {
    const f = field('sensory_type', 'select', [{ value: 'sound', label_key: 'opt.sound' }])
    expect(formatFieldValue(f, 'sound', t)).toBe('opt.sound')
  })

  it("shows a boolean's label only when true", () => {
    expect(formatFieldValue(field('echolalia', 'boolean'), true, t)).toBe('label.echolalia')
    expect(formatFieldValue(field('echolalia', 'boolean'), false, t)).toBeNull()
  })

  it('treats empty strings as nothing to show', () => {
    expect(formatFieldValue(field('note', 'text'), '  ', t)).toBeNull()
    expect(formatFieldValue(field('note', 'text'), 'Hi', t)).toBe('Hi')
  })

  it('never displays priority or list values directly', () => {
    expect(formatFieldValue(field('priority', 'priority_int'), 1, t)).toBeNull()
    expect(formatFieldValue(field('items', 'text_list'), ['a'], t)).toBeNull()
  })
})

describe('contactFieldRoles', () => {
  it('derives name, phone and details from field types', () => {
    const roles = contactFieldRoles([
      field('name', 'text'),
      field('relation', 'text'),
      field('phone', 'phone'),
      field('priority', 'priority_int'),
    ])
    expect(roles.nameField?.field_key).toBe('name')
    expect(roles.phoneField?.field_key).toBe('phone')
    expect(roles.detailFields.map(f => f.field_key)).toEqual(['relation'])
  })
})

describe('alerts', () => {
  const options = [
    { value: 'epilepsy', label_key: 'sharedPage.alertTypes.epilepsy' },
    { value: 'custom', label_key: 'sharedPage.alertTypes.custom' },
  ]

  it('labels built-in types from the option, ignoring any stored English label', () => {
    expect(alertLabel({ alert_type: 'epilepsy', label: 'Epilepsy' }, options, t)).toBe('sharedPage.alertTypes.epilepsy')
  })

  it('uses the parent-written label (or its translation) for custom alerts', () => {
    expect(alertLabel({ alert_type: 'custom', label: 'Bee sting' }, options, t)).toBe('Bee sting')
    expect(alertLabel({ alert_type: 'custom', label: 'Bee sting' }, options, t, 'Piqûre')).toBe('Piqûre')
    expect(alertLabel({ alert_type: 'custom', label: '' }, options, t)).toBe('sharedPage.alertTypes.custom')
  })

  it('falls back to the type default severity', () => {
    expect(alertSeverity({ alert_type: 'epilepsy' })).toBe('orange')
    expect(alertSeverity({ alert_type: 'epilepsy', severity: 'red' })).toBe('red')
    expect(alertSeverity({ alert_type: 'unknown' })).toBe('red')
  })
})
