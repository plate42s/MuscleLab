interface BarItem {
  label: string
  value: number
}

export function SimpleBars({
  items,
  unit = '',
  emptyText = 'Sin datos aún',
}: {
  items: BarItem[]
  unit?: string
  emptyText?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm ml-muted">{emptyText}</p>
  }

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = Math.max(6, Math.round((item.value / max) * 100))
        return (
          <div key={`${item.label}-${item.value}`} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
            <span className="truncate text-xs ml-muted">{item.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--ml-oat)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--ml-crimson), var(--ml-gold))',
                }}
              />
            </div>
            <span className="text-xs font-semibold ml-title">
              {item.value}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
