import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, TruckIcon } from 'lucide-react'
import { getMarketplaceOrders, getMarketplaceStats } from '@/lib/marketplace/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MARKETPLACE_ORDER_STATUS_LABELS } from '@/types'
import type { MarketplaceOrderStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Gestión de Pedidos – Marketplace SIG-PSP',
}

const ORDER_STATUS_COLORS: Record<MarketplaceOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}

const fmt = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1', 10)

  const [stats, ordersResult] = await Promise.all([
    getMarketplaceStats().catch(() => null),
    getMarketplaceOrders({
      status: params.status as MarketplaceOrderStatus | undefined,
      search: params.search,
      page,
      pageSize: 20,
    }).catch(() => ({ data: [], count: 0, page: 1, pageSize: 20, totalPages: 0 })),
  ])

  const kpiCards = [
    {
      label: 'Total Pedidos',
      value: stats?.total_orders ?? 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pendientes',
      value: stats?.by_order_status?.['pending'] ?? 0,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'En Proceso',
      value: (stats?.by_order_status?.['processing'] ?? 0) + (stats?.by_order_status?.['confirmed'] ?? 0),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Entregados',
      value: stats?.delivered_orders ?? 0,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Cancelados',
      value: stats?.by_order_status?.['cancelled'] ?? 0,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Ingresos Totales',
      value: fmt.format(stats?.total_revenue ?? 0),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      isText: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/marketplace">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeftIcon className="h-4 w-4" />
              Marketplace
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Pedidos</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Administra todos los pedidos del marketplace PSP.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <TruckIcon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className={`font-bold ${card.isText ? 'text-base' : 'text-xl'}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <form method="GET" className="flex flex-wrap gap-2">
          <input
            type="text"
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="Buscar por nº pedido o comprador..."
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[200px] flex-1 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos los estados</option>
            {(Object.keys(MARKETPLACE_ORDER_STATUS_LABELS) as MarketplaceOrderStatus[]).map(s => (
              <option key={s} value={s}>
                {MARKETPLACE_ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">Filtrar</Button>
          {(params.search || params.status) && (
            <Link href="/dashboard/marketplace/pedidos">
              <Button type="button" size="sm" variant="ghost">Limpiar</Button>
            </Link>
          )}
        </form>
      </div>

      {/* Tabla */}
      {ordersResult.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Sin pedidos</h3>
          <p className="text-sm text-muted-foreground">
            {params.search || params.status
              ? 'No se encontraron pedidos con los filtros aplicados.'
              : 'Aún no hay pedidos en el marketplace.'}
          </p>
        </div>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Nº Pedido</th>
                    <th className="text-left font-semibold px-4 py-3">Comprador</th>
                    <th className="text-left font-semibold px-4 py-3">Territorio</th>
                    <th className="text-right font-semibold px-4 py-3">Ítems</th>
                    <th className="text-right font-semibold px-4 py-3">Total</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Pago</th>
                    <th className="text-left font-semibold px-4 py-3">Fecha</th>
                    <th className="text-left font-semibold px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersResult.data.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                      <td className="px-4 py-3 font-medium">{order.buyer_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {order.territorial_name || '–'}
                      </td>
                      <td className="px-4 py-3 text-right">{order.item_count}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt.format(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ORDER_STATUS_COLORS[order.status]
                          }`}
                        >
                          {MARKETPLACE_ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : order.payment_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleDateString('es-PA')}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/marketplace/${order.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-7">
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Paginación */}
          {ordersResult.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {ordersResult.page} de {ordersResult.totalPages} · {ordersResult.count} pedidos
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?${new URLSearchParams(Object.fromEntries(Object.entries({ ...params, page: String(page - 1) }).filter(([, v]) => v !== undefined) as [string, string][]))}`}
                  >
                    <Button variant="outline" size="sm">Anterior</Button>
                  </Link>
                )}
                {page < ordersResult.totalPages && (
                  <Link
                    href={`?${new URLSearchParams(Object.fromEntries(Object.entries({ ...params, page: String(page + 1) }).filter(([, v]) => v !== undefined) as [string, string][]))}`}
                  >
                    <Button variant="outline" size="sm">Siguiente</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
