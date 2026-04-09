'use client'

interface ProgressGoalProps {
  label: string
  actual: number
  meta: number
  unidad: string
  color: string
}

export function ProgressGoal({
  label,
  actual,
  meta,
  unidad,
  color,
}: ProgressGoalProps) {
  const pct = meta > 0 ? Math.min(Math.round((actual / meta) * 100), 100) : 0
  const fmtNum = new Intl.NumberFormat('es-PA')

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {fmtNum.format(actual)}&nbsp;/&nbsp;{fmtNum.format(meta)}&nbsp;{unidad}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground">{pct}%</p>
    </div>
  )
}
