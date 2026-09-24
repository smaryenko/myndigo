interface Props {
  enabled: boolean
  onChange?: (value: boolean) => void
  disabled?: boolean
  label?: string
}

export function ToggleSwitch({ enabled, onChange, disabled = false, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange?.(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-green-500' : 'bg-slate-200'}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-8' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
