import type { Metadata } from 'next'
import Link from 'next/link'
import { ShoppingBagIcon, PlusIcon, PackageIcon, TruckIcon, StarIcon } from 'lucide-react'
import {
  getMarketplaceStats,
  getFeaturedProducts,
  getMarketplaceProducts,
  getMarketplaceOrders,
} from '@/lib/marketplace/api'
import { getMarketplaceCategories } from '@/lib/marketplace/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductFilters } from '@/components/marketplace/product-filters'
import { ProductCard } from '@/components/marketplace/product-card'
import {
  MARKETPLACE_PRODUCT_STATUS_LABELS,
  MARKETPLACE_ORDER_STATUS_LABELS,
} from '@/types'
import type { MarketplaceProductStatus, MarketplaceOrderStatus, MarketplaceProductType } from '@/types'

export const metadata: Metadata = {
  title: 'Marketplace – SIG-PSP',
}

const PRODUCT_STATUS_COLORS: Record<MarketplaceProductStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-700',
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
    tipo?: string
    categoria?: string
    search?: string
    page?: string
    status?: string
    min_price?: string
    max_price?: string
  }>
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1', 10)

  const [stats, featuredProducts, productsResult, ordersResult, categories] = await Promise.all([
    getMarketplaceStats().catch(() => null),
    getFeaturedProducts(6).catch(() => []),
    getMarketplaceProducts({
      search: params.search,
      categoryId: params.categoria,
      productType: params.tipo as MarketplaceProductType | undefined,
      status: (params.status as MarketplaceProductStatus | undefined) ?? undefined,
      minPrice: params.min_price ? Number(params.min_price) : undefined,
      maxPrice: params.max_price ? Number(params.max_price) : undefined,
      page,
      pageSize: 20,
    }).catch(() => ({ data: [], count: 0, page: 1, pageSize: 20, totalPages: 0 })),
    getMarketplaceOrders({ page: 1, pageSize: 5 }).catch(() => ({
      data: [],
      count: 0,
      page: 1,
      pageSize: 5,
      totalPages: 0,
    })),
    getMarketplaceCategories().catch(() => []),
  ])

  const kpiCards = [
    {
      label: 'Productos Activos',
      value: stats?.active_products ?? 0,
      icon: ShoppingBagIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Vendedores',
      value: stats?.total_sellers ?? 0,
      icon: PackageIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pedidos Pendientes',
      value: stats?.pending_orders ?? 0,
      icon: TruckIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Ingresos Totales (USD)',
      value: fmt.format(stats?.total_revenue ?? 0),
      icon: ShoppingBagIcon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      isText: true,
    },
    {
      label: 'Productos Destacados',
      value: stats?.featured_products ?? 0,
      icon: StarIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pedidos Entregados',
      value: stats?.delivered_orders ?? 0,
      icon: TruckIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  const hasFilters = !!(params.search || params.tipo || params.categoria || params.status || params.min_price || params.max_price)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace PSP</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de productos y servicios de productores, artesanos y emprendedores.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/marketplace/pedidos">
            <Button variant="outline" size="sm">
              <TruckIcon className="h-4 w-4 mr-2" />
              Gestión de Pedidos
            </Button>
          </Link>
          <Link href="/dashboard/marketplace/nuevo">
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-4 pb-3">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className={`text-xl font-bold ${card.isText ? 'text-base' : ''}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Productos Destacados */}
      {featuredProducts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-amber-500" />
            Productos Destacados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Catálogo con filtros */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">
            Catálogo completo
            {productsResult.count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({productsResult.count} productos)
              </span>
            )}
          </h2>
        </div>

        <ProductFilters categories={categories} />

        {productsResult.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBagIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {hasFilters ? 'Sin resultados' : 'Sin productos aún'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Agrega el primer producto al catálogo del marketplace PSP.'}
            </p>
            {!hasFilters && (
              <Link href="/dashboard/marketplace/nuevo" className="mt-4">
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-semibold px-4 py-3">SKU</th>
                      <th className="text-left font-semibold px-4 py-3">Producto</th>
                      <th className="text-left font-semibold px-4 py-3">Tipo</th>
                      <th className="text-left font-semibold px-4 py-3">Categoría</th>
                      <th className="text-left font-semibold px-4 py-3">Vendedor</th>
                      <th className="text-right font-semibold px-4 py-3">Precio</th>
                      <th className="text-right font-semibold px-4 py-3">Stock</th>
                      <th className="text-left font-semibold px-4 py-3">Estado</th>
                      <th className="text-left font-semibold px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsResult.data.map((product, idx) => (
                      <tr
                        key={product.id}
                        className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {product.sku || '–'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {product.main_image_url ? (
                              <img
                                src={product.main_image_url}
                                alt={product.name}
                                className="h-8 w-8 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <ShoppingBagIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium line-clamp-1">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {product.product_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {product.category_name || '–'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {product.seller_name}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {fmt.format(product.price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.stock_unlimited ? (
                            <span className="text-xs text-muted-foreground">∞</span>
                          ) : (
                            <span
                              className={
                                product.stock_qty <= product.low_stock_threshold
                                  ? 'text-red-600 font-medium'
                                  : ''
                              }
                            >
                              {product.stock_qty}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              PRODUCT_STATUS_COLORS[product.status]
                            }`}
                          >
                            {MARKETPLACE_PRODUCT_STATUS_LABELS[product.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/marketplace/${product.id}`}>
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
            {productsResult.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {productsResult.page} de {productsResult.totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`?${new URLSearchParams(Object.fromEntries(Object.entries({ ...params, page: String(page - 1) }).filter(([, v]) => v !== undefined) as [string, string][]))}`}>
                      <Button variant="outline" size="sm">Anterior</Button>
                    </Link>
                  )}
                  {page < productsResult.totalPages && (
                    <Link href={`?${new URLSearchParams(Object.fromEntries(Object.entries({ ...params, page: String(page + 1) }).filter(([, v]) => v !== undefined) as [string, string][]))}`}>
                      <Button variant="outline" size="sm">Siguiente</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Pedidos recientes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pedidos recientes</h2>
          <Link href="/dashboard/marketplace/pedidos">
            <Button variant="ghost" size="sm" className="text-xs">Ver todos →</Button>
          </Link>
        </div>

        {ordersResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pedidos registrados aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Nº Pedido</th>
                    <th className="text-left font-semibold px-4 py-3">Comprador</th>
                    <th className="text-right font-semibold px-4 py-3">Total</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersResult.data.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                      <td className="px-4 py-3">{order.buyer_name}</td>
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
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleDateString('es-PA')}
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
