import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { getMembership, getMembershipInvoices } from '@/lib/membresias/api'
import { getProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MembresiaActions } from '@/components/membresias/membresia-actions'
import { MEMBERSHIP_STATUS_LABELS } from '@/types'
import type { MembershipStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Detalle de membresía — SIG-PSP',
}

// ---------------------------------------------------------------------------
// Badge colours
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  past_due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspended: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
  refunded: 'bg-blue-100 text-blue-800',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(n)
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  yappy: 'Yappy',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  wallet: 'Wallet digital',
  subsidio: 'Subsidio',
  patrocinio: 'Patrocinio',
  manual: 'Manual',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MembresiaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [membership, invoices, profile] = await Promise.all([
    getMembership(id),
    getMembershipInvoices(id),
    getProfile(),
  ])

  if (!membership) notFound()

  const canManage =
    profile?.role && ['superadmin', 'admin', 'gestor', 'operador'].includes(profile.role)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/membresias" className="hover:text-foreground">Membresías</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{membership.actor_full_name}</span>
      </nav>

      {/* Back link */}
      <Link
        href="/dashboard/membresias"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a membresías
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{membership.actor_full_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-sm">
              {membership.plan_name}
            </Badge>
            <Badge
              variant="outline"
              className={`text-sm ${STATUS_COLORS[membership.status] ?? ''}`}
            >
              {MEMBERSHIP_STATUS_LABELS[membership.status] ?? membership.status}
            </Badge>
          </div>
        </div>

        {canManage && (
          <MembresiaActions id={id} status={membership.status} />
        )}
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de la suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Fecha de inicio</dt>
              <dd className="font-medium mt-0.5">{formatDate(membership.start_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha de vencimiento</dt>
              <dd className="font-medium mt-0.5">{formatDate(membership.end_at)}</dd>
            </div>
            {membership.renew_at && (
              <div>
                <dt className="text-muted-foreground">Próxima renovación</dt>
                <dd className="font-medium mt-0.5">{formatDate(membership.renew_at)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Monto pagado</dt>
              <dd className="font-medium mt-0.5">{formatCurrency(membership.amount_paid)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Precio del plan</dt>
              <dd className="font-medium mt-0.5">
                {formatCurrency(membership.price_monthly)}/mes
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Método de pago</dt>
              <dd className="font-medium mt-0.5">
                {membership.payment_method
                  ? (PAYMENT_METHOD_LABELS[membership.payment_method] ?? membership.payment_method)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renovación automática</dt>
              <dd className="font-medium mt-0.5">{membership.auto_renew ? 'Sí' : 'No'}</dd>
            </div>
            {membership.days_remaining != null && (
              <div>
                <dt className="text-muted-foreground">Días restantes</dt>
                <dd
                  className={`font-medium mt-0.5 ${
                    membership.days_remaining < 0
                      ? 'text-red-600'
                      : membership.is_expiring_soon
                        ? 'text-amber-600'
                        : ''
                  }`}
                >
                  {membership.days_remaining < 0
                    ? `Vencido hace ${Math.abs(membership.days_remaining)} días`
                    : `${membership.days_remaining} días`}
                </dd>
              </div>
            )}
            {membership.territorial_name && (
              <div>
                <dt className="text-muted-foreground">Territorio</dt>
                <dd className="font-medium mt-0.5">{membership.territorial_name}</dd>
              </div>
            )}
            {membership.cancel_reason && (
              <div className="col-span-full">
                <dt className="text-muted-foreground">Motivo de cancelación</dt>
                <dd className="font-medium mt-0.5 text-red-700">{membership.cancel_reason}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Features / Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beneficios del plan</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray((membership as { features?: unknown[] }).features) &&
          ((membership as { features?: unknown[] }).features ?? []).length > 0 ? (
            <ul className="space-y-1 text-sm">
              {((membership as { features?: { featureCode?: string; label?: string }[] }).features ?? []).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {f.label ?? f.featureCode ?? String(f)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Los beneficios están definidos en el plan <strong>{membership.plan_name}</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historial de pagos / facturas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay facturas registradas para esta suscripción.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-2">N° Factura</th>
                    <th className="text-left font-semibold px-4 py-2">Fecha</th>
                    <th className="text-left font-semibold px-4 py-2">Estado</th>
                    <th className="text-right font-semibold px-4 py-2">Monto</th>
                    <th className="text-right font-semibold px-4 py-2">Total</th>
                    <th className="text-left font-semibold px-4 py-2">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(inv.paid_at ?? inv.created_at)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${INVOICE_STATUS_COLORS[inv.status] ?? ''}`}
                        >
                          {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {inv.payment_method
                          ? (PAYMENT_METHOD_LABELS[inv.payment_method] ?? inv.payment_method)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
