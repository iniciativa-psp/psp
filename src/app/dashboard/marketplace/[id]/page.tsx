import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeftIcon,
  PackageIcon,
  StarIcon,
  TruckIcon,
  ShoppingBagIcon,
  BuildingIcon,
} from 'lucide-react'
import {
  getMarketplaceProduct,
  getProductOrders,
} from '@/lib/marketplace/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MARKETPLACE_PRODUCT_STATUS_LABELS,
  MARKETPLACE_PRODUCT_TYPE_LABELS,
  MARKETPLACE_ORDER_STATUS_LABELS,
} from '@/types'
import type { MarketplaceProductStatus, MarketplaceOrderStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Detalle de Producto – SIG-PSP',
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
  params: Promise<{ id: string }>
}

export default async function MarketplaceProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const [product, productOrders] = await Promise.all([
    getMarketplaceProduct(id),
    getProductOrders(id, 10).catch(() => []),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/dashboard/marketplace">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground truncate">{product.name}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                PRODUCT_STATUS_COLORS[product.status]
              }`}
            >
              {MARKETPLACE_PRODUCT_STATUS_LABELS[product.status]}
            </span>
            {product.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <StarIcon className="h-3 w-3" />
                Destacado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {MARKETPLACE_PRODUCT_TYPE_LABELS[product.product_type]} · SKU: {product.sku || '–'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">Editar</Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: description + gallery + reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Imagen principal */}
          {product.main_image_url && (
            <Card className="overflow-hidden">
              <img
                src={product.main_image_url}
                alt={product.name}
                className="w-full h-64 object-cover"
              />
            </Card>
          )}

          {/* Galería adicional */}
          {product.images && product.images.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Galería</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${product.name} ${i + 1}`}
                      className="h-20 w-full rounded object-cover"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descripción */}
          {product.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Métricas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{product.views_count}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Vistas</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{product.orders_count}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Pedidos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-primary">
                      {Number(product.rating_avg).toFixed(1)}
                    </span>
                    <StarIcon className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Rating</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{product.rating_count}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Reseñas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: price, stock, logistics, seller, sponsor */}
        <div className="space-y-4">
          {/* Precio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Precio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{fmt.format(product.price)}</span>
                {product.price_compare && product.price_compare > product.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {fmt.format(product.price_compare)}
                  </span>
                )}
              </div>
              {product.itbms_applies && (
                <p className="text-sm text-muted-foreground">
                  Con ITBMS ({product.itbms_rate}%): {fmt.format(product.price_with_itbms)}
                </p>
              )}
              {product.unit && (
                <p className="text-xs text-muted-foreground">Unidad: {product.unit}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Cantidad mínima: {product.min_order_qty}
              </p>
            </CardContent>
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock</span>
                <span className="font-medium">
                  {product.stock_unlimited ? 'Ilimitado' : product.stock_qty}
                </span>
              </div>
              {!product.stock_unlimited && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alerta bajo stock</span>
                  <span>{product.low_stock_threshold}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logística */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TruckIcon className="h-4 w-4" />
                Logística
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <Badge variant={product.delivery_available ? 'default' : 'secondary'} className="text-xs">
                  {product.delivery_available ? 'Disponible' : 'No disponible'}
                </Badge>
              </div>
              {product.delivery_available && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiempo estimado</span>
                  <span>{product.delivery_days_min}–{product.delivery_days_max} días</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup</span>
                <Badge variant={product.pickup_available ? 'default' : 'secondary'} className="text-xs">
                  {product.pickup_available ? 'Disponible' : 'No disponible'}
                </Badge>
              </div>
              {product.weight_kg && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso</span>
                  <span>{product.weight_kg} kg</span>
                </div>
              )}
              {product.dimensions_cm && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensiones</span>
                  <span>{product.dimensions_cm} cm</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendedor */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ShoppingBagIcon className="h-4 w-4" />
                Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {product.seller_logo_url ? (
                  <img
                    src={product.seller_logo_url}
                    alt={product.seller_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <PackageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{product.seller_name}</p>
                  {product.territorial_name && (
                    <p className="text-xs text-muted-foreground">{product.territorial_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patrocinador */}
          {product.sponsor_name && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5 text-amber-800">
                  <BuildingIcon className="h-4 w-4" />
                  Patrocinado por
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-amber-900 text-lg">{product.sponsor_name}</p>
              </CardContent>
            </Card>
          )}

          {/* Vinculación estratégica */}
          {product.strategy_item_id && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vinculación Estratégica</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/estrategia/${product.strategy_item_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver ítem estratégico →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pedidos del producto */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Últimos pedidos</h2>
        {productOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pedidos para este producto aún.</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Pedido</th>
                    <th className="text-right font-semibold px-4 py-3">Cantidad</th>
                    <th className="text-right font-semibold px-4 py-3">Total línea</th>
                    <th className="text-left font-semibold px-4 py-3">Estado</th>
                    <th className="text-left font-semibold px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {productOrders.map((item, idx) => {
                    const order = (item as Record<string, unknown>).marketplace_orders as Record<string, unknown> | null
                    return (
                      <tr
                        key={String(item.id)}
                        className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {order ? String(order.order_number ?? '–') : '–'}
                        </td>
                        <td className="px-4 py-3 text-right">{String(item.quantity)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {fmt.format(Number(item.line_total))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ORDER_STATUS_COLORS[String(item.status) as MarketplaceOrderStatus] ??
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {MARKETPLACE_ORDER_STATUS_LABELS[String(item.status) as MarketplaceOrderStatus] ??
                              String(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(String(item.created_at)).toLocaleDateString('es-PA')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
