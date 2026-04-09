import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EconomicStats } from '@/types'

interface IndicadoresChartProps {
  stats: EconomicStats
}

const CATEGORY_COLORS: Record<string, string> = {
  micro:   'bg-blue-400',
  pyme:    'bg-purple-400',
  grande:  'bg-indigo-400',
  social:  'bg-teal-400',
  general: 'bg-gray-400',
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

function TrendBadge({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  if (current > previous) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
        <TrendingUpIcon className="h-3 w-3" />
        +{current - previous}
      </span>
    )
  }
  if (current < previous) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
        <TrendingDownIcon className="h-3 w-3" />
        {current - previous}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <MinusIcon className="h-3 w-3" />
      Sin cambio
    </span>
  )
}

export function IndicadoresChart({ stats }: IndicadoresChartProps) {
  const totalFormalization = Object.values(stats.by_formalization).reduce((a, b) => a + b, 0)
  const totalAgentTypes = Object.values(stats.by_agent_type).reduce((a, b) => a + b, 0)

  const formalizationEntries = ['formal', 'en_proceso', 'informal']
    .map(key => ({ key, value: stats.by_formalization[key] ?? 0 }))
    .filter(e => e.value > 0)

  const agentTypeEntries = Object.entries(stats.by_agent_type)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const formalCount = stats.by_formalization['formal'] ?? 0
  const informalCount = stats.by_formalization['informal'] ?? 0
  const enProcesoCount = stats.by_formalization['en_proceso'] ?? 0

  const kpis = [
    {
      label: 'Agentes Formalizados',
      value: formalCount,
      total: totalFormalization,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'En Proceso',
      value: enProcesoCount,
      total: totalFormalization,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Informales',
      value: informalCount,
      total: totalFormalization,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Formalización KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Estado de Formalización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${kpi.color}`}>{kpi.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{kpi.value}</span>
                  <TrendBadge current={kpi.value} />
                </div>
              </div>
              <ProgressBar
                value={kpi.value}
                max={kpi.total}
                color={
                  kpi.label === 'Agentes Formalizados'
                    ? 'bg-green-500'
                    : kpi.label === 'En Proceso'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }
              />
            </div>
          ))}

          {formalizationEntries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin datos de formalización registrados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Distribución por tipo de agente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Distribución por Tipo de Agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentTypeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin agentes registrados aún.
            </p>
          ) : (
            agentTypeEntries.map(([code, count]) => (
              <div key={code} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm capitalize">{code.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                </div>
                <ProgressBar
                  value={count}
                  max={totalAgentTypes}
                  color={CATEGORY_COLORS[code] ?? 'bg-gray-400'}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
