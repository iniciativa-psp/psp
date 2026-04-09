'use client'

import Link from 'next/link'
import { EyeIcon, PencilIcon, AlertTriangleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  STRATEGY_LEVEL_LABELS,
  STRATEGY_STATUS_LABELS,
  ODS_COLORS,
} from '@/types'
import type { StrategySummary, StrategyLevel, StrategyStatus } from '@/types'

// ---------------------------------------------------------------------------
// Badge colour maps
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<StrategyLevel, string> = {
  plan: 'bg-blue-100 text-blue-800 border-blue-200',
  programa: 'bg-green-100 text-green-800 border-green-200',
  proyecto: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  actividad: 'bg-purple-100 text-purple-800 border-purple-200',
}

const STATUS_COLORS: Record<StrategyStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-teal-100 text-teal-800 border-teal-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color =
    clamped >= 70 ? 'bg-green-500' : clamped >= 30 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-9 text-right">
        {Math.round(clamped)}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ODS chips
// ---------------------------------------------------------------------------

function OdsChips({ goals }: { goals: number[] | null }) {
  if (!goals || goals.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-0.5">
      {goals.slice(0, 5).map(g => (
        <span
          key={g}
          className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-[10px] font-bold"
          style={{ backgroundColor: ODS_COLORS[g] ?? '#999' }}
          title={`ODS ${g}`}
        >
          {g}
        </span>
      ))}
      {goals.length > 5 && (
        <span className="text-xs text-muted-foreground">+{goals.length - 5}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Risk check
// ---------------------------------------------------------------------------

const HIGH_RISK = new Set(['high', 'very_high'])

function isHighRisk(item: StrategySummary): boolean {
  return (
    item.risk_probability != null &&
    item.risk_impact != null &&
    HIGH_RISK.has(item.risk_probability) &&
    HIGH_RISK.has(item.risk_impact)
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EstrategiaTableProps {
  items: StrategySummary[]
  onEdit?: (item: StrategySummary) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EstrategiaTable({ items, onEdit }: EstrategiaTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-lg font-medium">No se encontraron ítems estratégicos</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajusta los filtros o crea una nueva entrada estratégica.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nivel</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Responsable</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Presupuesto</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">KPI</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Territorio</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">ODS</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              {/* Código + riesgo */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-medium">{item.code}</span>
                  {isHighRisk(item) && (
                    <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" aria-label="Alto riesgo" />
                  )}
                </div>
              </td>

              {/* Nombre */}
              <td className="px-4 py-3 max-w-[200px]">
                <span className="font-medium line-clamp-2">{item.name}</span>
              </td>

              {/* Nivel */}
              <td className="px-4 py-3">
                <Badge className={`text-xs border ${LEVEL_COLORS[item.level]}`} variant="outline">
                  {STRATEGY_LEVEL_LABELS[item.level]}
                </Badge>
              </td>

              {/* Estado */}
              <td className="px-4 py-3">
                <Badge className={`text-xs border ${STATUS_COLORS[item.status]}`} variant="outline">
                  {STRATEGY_STATUS_LABELS[item.status]}
                </Badge>
              </td>

              {/* Responsable */}
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-xs text-muted-foreground">{item.responsible_name ?? '—'}</span>
              </td>

              {/* Presupuesto */}
              <td className="px-4 py-3 hidden lg:table-cell min-w-[120px]">
                {item.budget_planned != null ? (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      ${(item.budget_executed ?? 0).toLocaleString()} / ${item.budget_planned.toLocaleString()}
                    </span>
                    <ProgressBar pct={item.budget_pct} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>

              {/* KPI */}
              <td className="px-4 py-3 hidden lg:table-cell min-w-[120px]">
                {item.kpi_target != null ? (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {item.kpi_current ?? 0} / {item.kpi_target} {item.kpi_unit ?? ''}
                    </span>
                    <ProgressBar pct={item.kpi_pct} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>

              {/* Territorio */}
              <td className="px-4 py-3 hidden xl:table-cell">
                <span className="text-xs text-muted-foreground">{item.territorial_name ?? '—'}</span>
              </td>

              {/* ODS */}
              <td className="px-4 py-3 hidden xl:table-cell">
                <OdsChips goals={item.ods_goals} />
              </td>

              {/* Acciones */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href={`/dashboard/estrategia/${item.id}`} aria-label={`Ver ${item.name}`}>
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                  </Button>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(item)}
                      aria-label={`Editar ${item.name}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
