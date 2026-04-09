import type { Metadata } from 'next'
import { TrendingUpIcon, UsersIcon, BuildingIcon, CheckCircleIcon } from 'lucide-react'
import {
  getEconomicSectors,
  getEconomicStats,
  getEconomicActorsSummary,
} from '@/lib/desarrollo-economico/api'
import { Card, CardContent } from '@/components/ui/card'
import { SectorCard } from '@/components/desarrollo-economico/sector-card'
import { AgentesTable } from '@/components/desarrollo-economico/agentes-table'
import { IndicadoresChart } from '@/components/desarrollo-economico/indicadores-chart'
import type { EconomicSector } from '@/types'

export const metadata: Metadata = {
  title: 'Desarrollo Económico – SIG-PSP',
}

interface PageProps {
  searchParams: Promise<{
    search?: string
    sector?: string
    tipo?: string
    formalizacion?: string
    page?: string
  }>
}

export default async function DesarrolloEconomicoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1', 10)

  const [sectors, stats, actorsResult] = await Promise.all([
    getEconomicSectors().catch((): EconomicSector[] => []),
    getEconomicStats().catch(() => ({
      total_economic_actors: 0,
      by_sector: {} as Record<string, number>,
      by_agent_type: {} as Record<string, number>,
      by_formalization: {} as Record<string, number>,
    })),
    getEconomicActorsSummary({
      search: params.search,
      sectorCode: params.sector,
      agentTypeCode: params.tipo,
      formalizationStatus: params.formalizacion,
      page,
      pageSize: 20,
    }).catch(() => ({ data: [], count: 0, page: 1, pageSize: 20, totalPages: 0 })),
  ])

  const formalCount = stats.by_formalization['formal'] ?? 0
  const activeSectors = sectors.filter(s => (stats.by_sector[s.code] ?? 0) > 0)

  const kpiCards = [
    {
      label: 'Total Agentes',
      value: stats.total_economic_actors,
      icon: UsersIcon,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Agentes Formales',
      value: formalCount,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Sectores Activos',
      value: activeSectors.length,
      icon: BuildingIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Tipos de Agente',
      value: Object.keys(stats.by_agent_type).length,
      icon: TrendingUpIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Desarrollo Económico</h1>
        <p className="text-muted-foreground mt-1">
          Sectores productivos, agentes económicos y perfiles de formalización.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-4 pb-3">
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}
                >
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sectores Grid */}
      {sectors.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Sectores Económicos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sectors.map(sector => (
              <SectorCard
                key={sector.id}
                sector={sector}
                agentCount={stats.by_sector[sector.code] ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Indicadores */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores Clave</h2>
        <IndicadoresChart stats={stats} />
      </section>

      {/* Agentes Económicos Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Agentes Económicos
            {actorsResult.count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({actorsResult.count} registros)
              </span>
            )}
          </h2>
        </div>
        <AgentesTable
          data={actorsResult.data}
          count={actorsResult.count}
          page={actorsResult.page}
          totalPages={actorsResult.totalPages}
        />
      </section>
    </div>
  )
}
