import type { Metadata } from 'next'
import { getProvincias, getTerritorialStats } from '@/lib/territorial/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Territorial – SIG-PSP',
}

const LABELS: Record<string, string> = {
  province:      'Provincias',
  district:      'Distritos',
  corregimiento: 'Corregimientos',
  community:     'Comunidades',
}

export default async function TerritorialPage() {
  const [provincias, stats] = await Promise.all([
    getProvincias(),
    getTerritorialStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Territorial</h1>
        <p className="text-muted-foreground mt-1">
          División Político-Administrativa de la República de Panamá.
        </p>
      </div>

      {/* Estadísticas */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Resumen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([type, count]) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {LABELS[type] ?? type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Lista de provincias */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Provincias ({provincias.length})</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-semibold px-4 py-3">ID</th>
                  <th className="text-left font-semibold px-4 py-3">Nombre</th>
                  <th className="text-left font-semibold px-4 py-3">Código</th>
                </tr>
              </thead>
              <tbody>
                {provincias.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{p.id}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.code || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
