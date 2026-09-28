/**
 * Age in whole years for a 'YYYY-MM-DD' date of birth, by calendar date.
 *
 * Parses the date parts directly instead of `new Date('YYYY-MM-DD')`, which
 * is UTC midnight and shifts to the previous day west of Greenwich — and
 * compares month/day rather than dividing by 365.25 days, so the age ticks
 * over exactly on the birthday. Returns null for missing/invalid/future dates.
 */
export function ageInYears(dateOfBirth: string | null | undefined, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? '')
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  let age = today.getFullYear() - year
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}
