import type { Metadata } from 'next'
import { getStrategyItems, getStrategyStats } from '@/lib/estrategia/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STRATEGY_LEVEL_LABELS, STRATEGY_STATUS_LABELS } from '@/types'
import type { StrategyStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Estrategia – SIG-PSP',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function EstrategiaPage() {
  const [itemsResult, stats] = await Promise.all([
    getStrategyItems({ isActive: true, pageSize: 20 }),
    getStrategyStats(),
  ])

  const levelStats = Object.entries(stats)
    .filter(([k]) => k.startsWith('level_'))
    .map(([k, v]) => ({
      level: k.replace('level_', ''),
      count: v,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Estrategia</h1>
        <p className="text-muted-foreground mt-1">
          Planificación estratégica: planes, programas, proyectos y actividades del SIG-PSP.
        </p>
      </div>

      {/* Estadísticas por nivel */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Resumen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="border-indigo-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700">{stats['total'] ?? 0}</div>
            </CardContent>
          </Card>
          {levelStats.map(({ level, count }) => (
            <Card key={level}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {STRATEGY_LEVEL_LABELS[level as keyof typeof STRATEGY_LEVEL_LABELS] ?? level}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tabla de ítems estratégicos */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Ítems estratégicos ({itemsResult.count} total)
        </h2>
        {itemsResult.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin ítems estratégicos registrados aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Código</th>
                    <th className="text-left font-semibold px-4 py-3">Nombre</th>
                    <th className="text-left font-semibold px-4 py-3">Nivel</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Responsable</th>
                    <th className="text-right font-semibold px-4 py-3">Presupuesto</th>
                    <th className="text-right font-semibold px-4 py-3">KPI %</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsResult.data.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{item.code}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {STRATEGY_LEVEL_LABELS[item.level]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-800'}`}>
                          {STRATEGY_STATUS_LABELS[item.status as StrategyStatus] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.responsible_name || '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.budget_planned
                          ? `$${Number(item.budget_planned).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`
                          : '–'}
                        {item.budget_pct > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.budget_pct}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.kpi_target
                          ? `${item.kpi_pct}%`
                          : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
