import type { Metadata } from 'next'
import { getPaymentConcepts, getPayments, getPaymentTotals } from '@/lib/pagos/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Pagos – SIG-PSP',
}

export default async function PagosPage() {
  const [concepts, payments, totals] = await Promise.all([
    getPaymentConcepts(),
    getPayments({ status: 'completed', pageSize: 10 }),
    getPaymentTotals(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulo Pagos</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de conceptos de pago, beneficiarios y transacciones.
        </p>
      </div>

      {/* Totales por concepto */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Totales por concepto (completados)</h2>
        {totals.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin pagos completados aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {totals.map((t) => (
              <Card key={t.concept_id} className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.concept_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    ${t.total_amount.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.payment_count} pagos</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Conceptos */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Conceptos de pago ({concepts.length})</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-semibold px-4 py-3">Nombre</th>
                  <th className="text-left font-semibold px-4 py-3">Monto</th>
                  <th className="text-left font-semibold px-4 py-3">Moneda</th>
                </tr>
              </thead>
              <tbody>
                {concepts.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">${c.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Últimos pagos completados */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Últimos pagos completados</h2>
        {payments.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin pagos registrados aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Referencia</th>
                    <th className="text-left font-semibold px-4 py-3">Beneficiario</th>
                    <th className="text-left font-semibold px-4 py-3">Concepto</th>
                    <th className="text-left font-semibold px-4 py-3">Monto</th>
                    <th className="text-left font-semibold px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.data.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 text-muted-foreground">{p.reference_code ?? '–'}</td>
                      <td className="px-4 py-3">{p.beneficiary_name ?? '–'}</td>
                      <td className="px-4 py-3">{p.concept_name ?? '–'}</td>
                      <td className="px-4 py-3 font-medium">${p.amount.toFixed(2)} {p.currency}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('es-PA') : '–'}
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
