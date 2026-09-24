interface Props {
  /** Full-screen centered spinner */
  fullPage?: boolean
}

export function LoadingSpinner({ fullPage = false }: Props) {
  const spinner = (
    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  )

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex justify-center py-16">
      {spinner}
    </div>
  )
}
