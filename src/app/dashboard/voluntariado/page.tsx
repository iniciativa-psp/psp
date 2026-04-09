import type { Metadata } from 'next'
import Link from 'next/link'
import { HeartHandshakeIcon, PlusIcon, UsersIcon, ClockIcon, BriefcaseIcon, InboxIcon } from 'lucide-react'
import { getVolunteerOpportunities, getVolunteerApplications, getVolunteerStats } from '@/lib/voluntariado/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OpportunityCard } from '@/components/voluntariado/opportunity-card'
import { ApplicationTable } from '@/components/voluntariado/application-table'

export const metadata: Metadata = {
  title: 'Voluntariado – SIG-PSP',
}

export default async function VoluntariadoPage() {
  const [opportunitiesResult, applicationsResult, stats] = await Promise.all([
    getVolunteerOpportunities({ pageSize: 20 }),
    getVolunteerApplications({ pageSize: 50 }),
    getVolunteerStats().catch(() => null),
  ])

  const opportunities = opportunitiesResult.data
  const applications = applicationsResult.data

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HeartHandshakeIcon className="h-6 w-6 text-pink-600" />
            Voluntariado
          </h1>
          <p className="text-muted-foreground mt-1">
            Oportunidades de voluntariado y gestión de postulaciones.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Nueva oportunidad
        </Button>
      </div>

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Voluntariado</span>
      </nav>

      {/* KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores principales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-pink-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4 text-pink-500" />
                Voluntarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-700">
                {stats?.total_volunteers ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <BriefcaseIcon className="h-4 w-4 text-emerald-500" />
                Oportunidades activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {stats?.active_opportunities ?? opportunities.filter(o => o.status === 'open').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-blue-500" />
                Total horas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats?.total_hours?.toLocaleString('es-PA') ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <InboxIcon className="h-4 w-4 text-amber-500" />
                Postulaciones pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {stats?.pending_applications ??
                  applications.filter(a => a.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Lista de oportunidades */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Oportunidades de voluntariado</h2>
          <Badge variant="outline">{opportunitiesResult.count} total</Badge>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
            <HeartHandshakeIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay oportunidades de voluntariado registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map(opp => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </section>

      {/* Tabla de postulaciones */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Postulaciones</h2>
          <Badge variant="outline">{applicationsResult.count} total</Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            <ApplicationTable applications={applications} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
