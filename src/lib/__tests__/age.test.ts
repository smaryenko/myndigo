import { describe, expect, it } from 'vitest'
import { ageInYears } from '../age'

describe('ageInYears', () => {
  const today = new Date(2026, 8, 28) // 28 Sep 2026, local time

  it('counts whole years by calendar date', () => {
    expect(ageInYears('2018-09-28', today)).toBe(8) // birthday today
    expect(ageInYears('2018-09-29', today)).toBe(7) // birthday tomorrow
    expect(ageInYears('2018-01-01', today)).toBe(8)
  })

  it('returns null for missing, invalid or future dates', () => {
    expect(ageInYears(null, today)).toBeNull()
    expect(ageInYears('not a date', today)).toBeNull()
    expect(ageInYears('2018-13-01', today)).toBeNull()
    expect(ageInYears('2030-01-01', today)).toBeNull()
  })
})
