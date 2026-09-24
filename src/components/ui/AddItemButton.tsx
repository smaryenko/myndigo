interface Props {
  label: string
  onClick: () => void
}

export function AddItemButton({ label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border border-dashed border-slate-300 text-slate-500 rounded-xl py-2.5 text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
    >
      {label}
    </button>
  )
}
