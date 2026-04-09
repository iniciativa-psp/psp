import type { Metadata } from 'next'
import { getJobPositions, getEmploymentDashboardStats } from '@/lib/empleos/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_SECTOR_LABELS,
} from '@/types'
import type { EmploymentSector, EmploymentType } from '@/types'

export const metadata: Metadata = {
  title: 'Empleos – SIG-PSP',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  filled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function EmpleosPage() {
  const [positionsResult, dashStats] = await Promise.all([
    getJobPositions({ pageSize: 15 }),
    getEmploymentDashboardStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Empleos</h1>
        <p className="text-muted-foreground mt-1">
          Pilar central de la estrategia — Meta: 194,944 nuevos empleos para Panamá.
        </p>
      </div>

      {/* Dashboard stats */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores principales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Posiciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {dashStats?.total_positions ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Abiertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashStats?.positions_open ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vacantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {dashStats?.total_vacancies ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cubiertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashStats?.total_filled ?? 0}
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
                {dashStats?.total_applications ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Empleos activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {dashStats?.total_employment_records ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Por sector */}
      {dashStats?.by_sector && dashStats.by_sector.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Por sector</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashStats.by_sector.map((s) => (
              <Card key={s.sector}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {EMPLOYMENT_SECTOR_LABELS[s.sector as EmploymentSector] ?? s.sector}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-primary">{s.count}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.vacancies} vacantes · {s.filled} cubiertas
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Tabla de posiciones */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Posiciones laborales ({positionsResult.count} total)
        </h2>
        {positionsResult.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin posiciones laborales registradas aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Título</th>
                    <th className="text-left font-semibold px-4 py-3">Empleador</th>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Sector</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-right font-semibold px-4 py-3">Vacantes</th>
                    <th className="text-right font-semibold px-4 py-3">Salario</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsResult.data.map((pos, idx) => (
                    <tr key={pos.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">
                        {pos.title}
                        {pos.is_youth_priority && (
                          <Badge variant="outline" className="text-xs ml-1 border-orange-300 text-orange-700">Joven</Badge>
                        )}
                        {pos.is_female_priority && (
                          <Badge variant="outline" className="text-xs ml-1 border-pink-300 text-pink-700">Mujer</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pos.employer_name || '–'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {EMPLOYMENT_TYPE_LABELS[pos.employment_type as EmploymentType] ?? pos.employment_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {EMPLOYMENT_SECTOR_LABELS[pos.sector as EmploymentSector] ?? pos.sector}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pos.status] ?? 'bg-gray-100 text-gray-800'}`}>
                          {EMPLOYMENT_STATUS_LABELS[pos.status] ?? pos.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pos.positions_filled}/{pos.positions_available}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {pos.salary_min || pos.salary_max
                          ? `$${pos.salary_min?.toLocaleString('es-PA') ?? '?'} – $${pos.salary_max?.toLocaleString('es-PA') ?? '?'}`
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
