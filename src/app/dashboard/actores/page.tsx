import type { Metadata } from 'next'
import { getActors, getActorStats } from '@/lib/actores/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ACTOR_TYPE_LABELS } from '@/types'

export const metadata: Metadata = {
  title: 'Actores – SIG-PSP',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-800',
}

export default async function ActoresPage() {
  const [actoresResult, stats] = await Promise.all([
    getActors({ isActive: true, pageSize: 20 }),
    getActorStats(),
  ])

  const typeStats = Object.entries(stats)
    .filter(([k]) => k.startsWith('type_'))
    .map(([k, v]) => ({
      type: k.replace('type_', ''),
      count: v,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Actores / CRM</h1>
        <p className="text-muted-foreground mt-1">
          Registro de personas, hogares, empresas, cooperativas, ONGs e instituciones vinculadas al programa.
        </p>
      </div>

      {/* Estadísticas */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Resumen por tipo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{stats['total'] ?? 0}</div>
            </CardContent>
          </Card>
          {typeStats.map(({ type, count }) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ACTOR_TYPE_LABELS[type as keyof typeof ACTOR_TYPE_LABELS] ?? type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tabla de actores */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Actores recientes ({actoresResult.count} total)
        </h2>
        {actoresResult.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin actores registrados aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Nombre</th>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Cédula/RUC</th>
                    <th className="text-left font-semibold px-4 py-3">Email</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Territorio</th>
                  </tr>
                </thead>
                <tbody>
                  {actoresResult.data.map((actor, idx) => (
                    <tr key={actor.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">{actor.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {ACTOR_TYPE_LABELS[actor.actor_type] ?? actor.actor_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {actor.id_number || actor.ruc || '–'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{actor.email || '–'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[actor.status] ?? 'bg-gray-100 text-gray-800'}`}>
                          {actor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {actor.territorial_name || '–'}
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
