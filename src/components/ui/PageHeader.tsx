interface Props {
  title: string
  onBack: () => void
  /** Optional element rendered on the right side */
  action?: React.ReactNode
}

export function PageHeader({ title, onBack, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 hover:text-slate-700 text-sm"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
