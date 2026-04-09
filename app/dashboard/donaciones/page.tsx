import type { Metadata } from 'next'
import { HeartIcon, TrendingUpIcon, HandshakeIcon, DollarSignIcon } from 'lucide-react'
import { getDonations, getSponsorships, getFundraisingStats } from '@/lib/donaciones/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DonacionesTable } from '@/components/donaciones/donaciones-table'
import { PatrociniosTable } from '@/components/donaciones/patrocinios-table'
import { DonacionForm } from '@/components/donaciones/donacion-form'
import { PatrocinioForm } from '@/components/donaciones/patrocinio-form'

export const metadata: Metadata = {
  title: 'Donaciones & Patrocinios – SIG-PSP',
}

const fmt = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })

export default async function DonacionesPage() {
  const [donationsResult, sponsorshipsResult, statsResult] = await Promise.allSettled([
    getDonations({ pageSize: 20 }),
    getSponsorships({ pageSize: 20 }),
    getFundraisingStats(),
  ])

  const donations =
    donationsResult.status === 'fulfilled' ? donationsResult.value : { data: [], count: 0, page: 1, pageSize: 20, totalPages: 0 }
  const sponsorships =
    sponsorshipsResult.status === 'fulfilled' ? sponsorshipsResult.value : { data: [], count: 0, page: 1, pageSize: 20, totalPages: 0 }
  const stats =
    statsResult.status === 'fulfilled'
      ? statsResult.value
      : { total_donations: 0, total_sponsorships: 0, top_donors: [], by_type: {} }

  const activeSponsors = sponsorships.data.filter((s) => s.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donaciones &amp; Patrocinios</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de donaciones individuales y patrocinios corporativos.
        </p>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-rose-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSignIcon className="h-4 w-4 text-rose-500" />
                Total Recaudado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700">
                {fmt.format(stats.total_donations + stats.total_sponsorships)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">donaciones + patrocinios</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HeartIcon className="h-4 w-4 text-green-500" />
                Total Donaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {fmt.format(stats.total_donations)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{donations.count} registros</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                Total Patrocinios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {fmt.format(stats.total_sponsorships)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">monto anual</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HandshakeIcon className="h-4 w-4 text-purple-500" />
                Patrocinios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{activeSponsors}</div>
              <p className="text-xs text-muted-foreground mt-1">de {sponsorships.count} totales</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tabs: Donaciones | Patrocinios */}
      <section>
        <Tabs defaultValue="donaciones">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="donaciones">
                Donaciones ({donations.count})
              </TabsTrigger>
              <TabsTrigger value="patrocinios">
                Patrocinios ({sponsorships.count})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="donaciones" className="space-y-3">
            <div className="flex justify-end">
              <DonacionForm />
            </div>
            {donationsResult.status === 'rejected' ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Error al cargar donaciones. Por favor recarga la página.
              </div>
            ) : (
              <DonacionesTable
                donations={donations.data}
                total={donations.count}
                page={donations.page}
                pageSize={donations.pageSize}
              />
            )}
          </TabsContent>

          <TabsContent value="patrocinios" className="space-y-3">
            <div className="flex justify-end">
              <PatrocinioForm />
            </div>
            {sponsorshipsResult.status === 'rejected' ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Error al cargar patrocinios. Por favor recarga la página.
              </div>
            ) : (
              <PatrociniosTable
                sponsorships={sponsorships.data}
                total={sponsorships.count}
                page={sponsorships.page}
                pageSize={sponsorships.pageSize}
              />
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
