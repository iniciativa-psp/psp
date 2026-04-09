import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, AlertTriangleIcon } from 'lucide-react'
import {
  getStrategyItem,
  getStrategyTree,
  getStrategyBudgetSummary,
  getStatusLog,
} from '@/lib/estrategia/api'
import { getProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyTree } from '@/components/estrategia/strategy-tree'
import { EstrategiaDetailClient } from '@/components/estrategia/estrategia-detail-client'
import {
  STRATEGY_LEVEL_LABELS,
  STRATEGY_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  ODS_LABELS,
  ODS_COLORS,
} from '@/types'
import type { StrategyStatus, StrategyLevel, RiskLevel } from '@/types'

export const metadata: Metadata = {
  title: 'Detalle Estratégico — SIG-PSP',
}

// ---------------------------------------------------------------------------
// Badge colours
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
// Risk matrix (2×2 visual)
// ---------------------------------------------------------------------------

const RISK_VALUES: Record<RiskLevel, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
}

function RiskMatrix({
  probability,
  impact,
}: {
  probability: RiskLevel | null
  impact: RiskLevel | null
}) {
  if (!probability && !impact) return null

  const probVal = probability ? RISK_VALUES[probability] : 0
  const impactVal = impact ? RISK_VALUES[impact] : 0
  const score = probVal * impactVal
  const color =
    score >= 16 ? 'text-red-600 bg-red-50' :
    score >= 9 ? 'text-orange-600 bg-orange-50' :
    score >= 4 ? 'text-yellow-600 bg-yellow-50' :
    'text-green-600 bg-green-50'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${color}`}>
      {score >= 12 && <AlertTriangleIcon className="h-5 w-5 shrink-0" />}
      <div>
        <p className="text-sm font-semibold">Matriz de riesgo</p>
        <p className="text-xs mt-0.5">
          Probabilidad: {probability ? RISK_LEVEL_LABELS[probability] : '—'} ×
          Impacto: {impact ? RISK_LEVEL_LABELS[impact] : '—'}
          {score > 0 && <span className="ml-1">(score {score}/25)</span>}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color =
    clamped >= 70 ? 'bg-green-500' : clamped >= 30 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EstrategiaDetailPage({ params }: PageProps) {
  const { id } = await params
  const [item, profile] = await Promise.all([getStrategyItem(id), getProfile()])

  if (!item) notFound()

  const [tree, statusLog, budgetSummary] = await Promise.all([
    (item.level === 'plan' || item.level === 'programa')
      ? getStrategyTree(id)
      : Promise.resolve([]),
    getStatusLog(id),
    item.level === 'plan' ? getStrategyBudgetSummary(id) : Promise.resolve([]),
  ])

  const canEdit = profile
    ? ['superadmin', 'admin', 'gestor', 'operador'].includes(profile.role)
    : false

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/estrategia">
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Volver
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
            <Badge className={`text-xs border ${LEVEL_COLORS[item.level]}`} variant="outline">
              {STRATEGY_LEVEL_LABELS[item.level]}
            </Badge>
            <Badge className={`text-xs border ${STATUS_COLORS[item.status]}`} variant="outline">
              {STRATEGY_STATUS_LABELS[item.status]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold mt-1">{item.name}</h1>
        </div>

        {canEdit && (
          <EstrategiaDetailClient item={item} />
        )}
      </div>

      {/* Section 1 — Resumen ejecutivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Responsable</p>
              <p className="text-sm font-medium">{item.responsible_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Territorio</p>
              <p className="text-sm font-medium">{item.territorial_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fecha de inicio</p>
              <p className="text-sm font-medium">
                {item.start_date ? new Date(item.start_date).toLocaleDateString('es-PA') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fecha de cierre</p>
              <p className="text-sm font-medium">
                {item.end_date ? new Date(item.end_date).toLocaleDateString('es-PA') : '—'}
              </p>
            </div>
          </div>

          {item.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm leading-relaxed">{item.description}</p>
            </div>
          )}

          {item.objective && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objetivo</p>
              <p className="text-sm leading-relaxed">{item.objective}</p>
            </div>
          )}

          {/* ODS */}
          {item.ods_goals && item.ods_goals.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">ODS vinculados</p>
              <div className="flex flex-wrap gap-2">
                {item.ods_goals.map(g => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-white text-xs font-semibold"
                    style={{ backgroundColor: ODS_COLORS[g] ?? '#999' }}
                  >
                    <span className="font-bold">{g}</span>
                    <span className="font-normal">{ODS_LABELS[g]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk */}
          <RiskMatrix probability={item.risk_probability} impact={item.risk_impact} />
        </CardContent>
      </Card>

      {/* Section 2 — Presupuesto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.budget_planned != null ? (
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Planificado</p>
                  <p className="text-lg font-bold">${item.budget_planned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ejecutado</p>
                  <p className="text-lg font-bold">${(item.budget_executed ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Moneda</p>
                  <p className="text-lg font-bold">{item.currency}</p>
                </div>
              </div>
              <ProgressBar pct={item.budget_pct} label="Ejecución presupuestaria" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No se ha definido presupuesto.</p>
          )}

          {/* Budget summary table for plans */}
          {item.level === 'plan' && budgetSummary.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Resumen por hijo</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nivel</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Planificado</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ejecutado</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {budgetSummary.map(row => (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono">{row.code}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{STRATEGY_LEVEL_LABELS[row.level]}</td>
                        <td className="px-3 py-2 text-right">${row.budget_planned.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">${row.budget_executed.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{Math.round(row.budget_pct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — KPI + Status history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI y seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.kpi_target != null ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actual</p>
                  <p className="text-lg font-bold">{item.kpi_current ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Meta</p>
                  <p className="text-lg font-bold">{item.kpi_target}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Unidad</p>
                  <p className="text-lg font-bold">{item.kpi_unit ?? '—'}</p>
                </div>
              </div>
              <ProgressBar pct={item.kpi_pct} label="Avance KPI" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se ha definido KPI.</p>
          )}

          {/* Status history */}
          {statusLog.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-3">Historial de estados</p>
              <ol className="relative border-l border-muted-foreground/20 space-y-4 ml-3">
                {statusLog.map(log => (
                  <li key={log.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground/40" />
                    <div className="text-xs text-muted-foreground mb-0.5">
                      {new Date(log.changed_at).toLocaleString('es-PA')}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {log.old_status && (
                        <>
                          <Badge
                            className={`text-[10px] border ${STATUS_COLORS[log.old_status as StrategyStatus]}`}
                            variant="outline"
                          >
                            {STRATEGY_STATUS_LABELS[log.old_status as StrategyStatus]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge
                        className={`text-[10px] border ${STATUS_COLORS[log.new_status as StrategyStatus]}`}
                        variant="outline"
                      >
                        {STRATEGY_STATUS_LABELS[log.new_status as StrategyStatus]}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{log.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Children tree */}
      {(item.level === 'plan' || item.level === 'programa') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Árbol de {item.level === 'plan' ? 'programas y proyectos' : 'proyectos y actividades'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StrategyTree nodes={tree} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
