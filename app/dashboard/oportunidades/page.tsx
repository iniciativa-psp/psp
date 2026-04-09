import type { Metadata } from 'next'
import { getOpportunities, getOpportunityStats } from '@/lib/oportunidades/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
} from '@/types'
import type { OpportunityType, OpportunityStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Oportunidades – SIG-PSP',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function OportunidadesPage() {
  const [oppsResult, stats] = await Promise.all([
    getOpportunities({ pageSize: 15 }),
    getOpportunityStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Oportunidades</h1>
        <p className="text-muted-foreground mt-1">
          Oportunidades de desarrollo económico: capacitación, financiamiento, mercados y más.
        </p>
      </div>

      {/* Indicadores */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores principales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{stats?.total ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Presupuesto disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                ${(stats?.total_budget ?? 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Postulaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats?.total_applications ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beneficiarios meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(stats?.total_beneficiaries_target ?? 0).toLocaleString('es-PA')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beneficiarios actuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(stats?.total_beneficiaries_current ?? 0).toLocaleString('es-PA')}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Por tipo */}
      {stats?.by_type && stats.by_type.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Por tipo de oportunidad</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.by_type.map((t) => (
              <Card key={t.opportunity_type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {OPPORTUNITY_TYPE_LABELS[t.opportunity_type as OpportunityType] ?? t.opportunity_type}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-primary">{t.count}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Tabla de oportunidades */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Oportunidades ({oppsResult.count} total)
        </h2>
        {oppsResult.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin oportunidades registradas aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Título</th>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Proveedor</th>
                    <th className="text-right font-semibold px-4 py-3">Presupuesto</th>
                    <th className="text-right font-semibold px-4 py-3">Beneficiarios</th>
                    <th className="text-left font-semibold px-4 py-3">Fecha límite</th>
                  </tr>
                </thead>
                <tbody>
                  {oppsResult.data.map((opp, idx) => (
                    <tr key={opp.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">{opp.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {OPPORTUNITY_TYPE_LABELS[opp.opportunity_type as OpportunityType] ?? opp.opportunity_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-800'}`}>
                          {OPPORTUNITY_STATUS_LABELS[opp.status as OpportunityStatus] ?? opp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {opp.provider_name || '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {opp.budget_available
                          ? `$${Number(opp.budget_available).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {opp.beneficiaries_current}/{opp.beneficiaries_target ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {opp.application_deadline
                          ? new Date(opp.application_deadline).toLocaleDateString('es-PA')
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
