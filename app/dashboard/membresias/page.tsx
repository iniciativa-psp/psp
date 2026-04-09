import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusIcon, CreditCardIcon } from 'lucide-react'
import { getMembershipPlans, getMemberships, getMembresiaStats } from '@/lib/membresias/api'
import { getProfile } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MembresiasFilters } from '@/components/membresias/membresias-filters'
import { MembresiasTable } from '@/components/membresias/membresias-table'
import type { MembershipStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Membresías — SIG-PSP',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(n)
}

const PLAN_COLORS: Record<string, string> = {
  hogar_solidario: 'bg-blue-50 border-blue-200 text-blue-800',
  agricultor: 'bg-green-50 border-green-200 text-green-800',
  artesano: 'bg-orange-50 border-orange-200 text-orange-800',
  comercio_mercadito: 'bg-purple-50 border-purple-200 text-purple-800',
  empresa_solidaria: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  ong_cooperativa: 'bg-teal-50 border-teal-200 text-teal-800',
  socio_estrategico_per: 'bg-rose-50 border-rose-200 text-rose-800',
  socio_estrategico_emp: 'bg-red-50 border-red-200 text-red-800',
  inversor_social_per: 'bg-amber-50 border-amber-200 text-amber-800',
  inversor_social_com: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SearchParams {
  plan?: string
  estado?: string
  search?: string
  page?: string
}

export default async function MembresiasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const status = params.estado as MembershipStatus | undefined
  const planId = params.plan || undefined
  const search = params.search || undefined

  const [plansResult, membershipsResult, stats, profile] = await Promise.all([
    getMembershipPlans({ status: 'published', pageSize: 50 }),
    getMemberships({ status, planId, search, page, pageSize: 20 }),
    getMembresiaStats(),
    getProfile(),
  ])

  const canManage = profile?.role && ['superadmin', 'admin', 'gestor', 'operador'].includes(profile.role)
  const plans = plansResult.data
  const memberships = membershipsResult.data

  // Count active memberships per plan for plan cards
  const activeMembersByPlan = stats.by_plan

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membresías</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de planes, suscripciones y beneficios para miembros.
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/membresias/nueva">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Nueva suscripción
            </Button>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores principales</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4" />
                Suscripciones activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{stats.total_active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(stats.total_revenue_month)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos del año
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.total_revenue_year)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa de renovación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{stats.renewal_rate}%</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Plan cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Planes disponibles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {plans.map(plan => (
            <Card key={plan.id} className={`border ${PLAN_COLORS[plan.code] ?? ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-tight">{plan.name}</CardTitle>
                <div className="text-lg font-bold">
                  ${plan.price_monthly}
                  <span className="text-xs font-normal text-muted-foreground">/mes</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {activeMembersByPlan[plan.name] ?? 0} activos
                  </Badge>
                </div>
                {plan.description && (
                  <CardDescription className="text-xs mt-2 line-clamp-2">
                    {plan.description}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Filters + table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">
            Suscripciones ({membershipsResult.count})
          </h2>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="mb-4">
              <MembresiasFilters plans={plans} />
            </div>

            {memberships.length === 0 ? (
              <div className="text-center py-12">
                <CreditCardIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">No hay suscripciones registradas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {params.search || params.estado || params.plan
                    ? 'Prueba con otros filtros o limpia la búsqueda.'
                    : 'Crea la primera suscripción usando el botón "Nueva suscripción".'}
                </p>
              </div>
            ) : (
              <MembresiasTable memberships={memberships} />
            )}

            {/* Pagination */}
            {membershipsResult.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 pt-4 border-t">
                {page > 1 && (
                  <Link
                    href={`/dashboard/membresias?${new URLSearchParams({
                      ...(params.search ? { search: params.search } : {}),
                      ...(params.estado ? { estado: params.estado } : {}),
                      ...(params.plan ? { plan: params.plan } : {}),
                      page: String(page - 1),
                    }).toString()}`}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  Página {page} de {membershipsResult.totalPages}
                </span>
                {page < membershipsResult.totalPages && (
                  <Link
                    href={`/dashboard/membresias?${new URLSearchParams({
                      ...(params.search ? { search: params.search } : {}),
                      ...(params.estado ? { estado: params.estado } : {}),
                      ...(params.plan ? { plan: params.plan } : {}),
                      page: String(page + 1),
                    }).toString()}`}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
