import type { TFunction } from 'i18next'
import { alertDisplay } from './types'
import type { AlertSeverity, EntryValues, FieldOption } from './types'

/**
 * Display label for an alert entry. Built-in alert types are labelled from
 * their alert_type option (translated UI string) — only 'custom' alerts
 * store a parent-written `label`, which may have a content translation.
 */
export function alertLabel(
  values: EntryValues,
  alertTypeOptions: FieldOption[] | null | undefined,
  t: TFunction,
  translatedCustomLabel?: string,
): string {
  const alertType = String(values.alert_type ?? 'custom')
  const optionLabel = () => {
    const option = alertTypeOptions?.find(o => o.value === alertType)
    return t(option?.label_key ?? `sharedPage.alertTypes.${alertType}`)
  }
  if (alertType === 'custom') {
    const custom = typeof values.label === 'string' ? values.label.trim() : ''
    return translatedCustomLabel ?? (custom || optionLabel())
  }
  return optionLabel()
}

export function alertSeverity(values: EntryValues): AlertSeverity {
  return values.severity === 'orange' || values.severity === 'red'
    ? values.severity
    : alertDisplay(values.alert_type).severity
}

export function alertEmoji(values: EntryValues): string {
  return alertDisplay(values.alert_type).emoji
}
