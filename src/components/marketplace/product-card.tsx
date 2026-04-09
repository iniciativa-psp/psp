'use client'

import Link from 'next/link'
import { ShoppingBagIcon, StarIcon, PackageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MARKETPLACE_PRODUCT_TYPE_LABELS } from '@/types'
import type { MarketplaceProductSummary } from '@/types'

const fmt = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })

const TYPE_COLORS: Record<string, string> = {
  product: 'bg-blue-100 text-blue-800',
  service: 'bg-purple-100 text-purple-800',
  digital: 'bg-cyan-100 text-cyan-800',
  agricultural: 'bg-green-100 text-green-800',
  artisanal: 'bg-orange-100 text-orange-800',
}

interface ProductCardProps {
  product: MarketplaceProductSummary
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock =
    !product.stock_unlimited &&
    product.stock_qty <= product.low_stock_threshold &&
    product.stock_qty > 0

  const sponsorHeight =
    product.sponsor_display_size === 'large'
      ? 'h-8'
      : product.sponsor_display_size === 'medium'
        ? 'h-6'
        : 'h-4'

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {product.main_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.main_image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <PackageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Tipo badge – top left */}
        <span
          className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            TYPE_COLORS[product.product_type] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {MARKETPLACE_PRODUCT_TYPE_LABELS[product.product_type]}
        </span>

        {/* Featured badge – top right */}
        {product.featured && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <StarIcon className="h-3 w-3" />
            Destacado
          </span>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Nombre */}
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>

        {/* Vendedor */}
        <div className="flex items-center gap-2">
          {product.seller_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.seller_logo_url}
              alt={product.seller_name}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBagIcon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">{product.seller_name}</span>
        </div>

        {/* Patrocinador */}
        {product.sponsor_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Patrocinado por</span>
            <span className={`font-medium ${sponsorHeight}`}>{product.sponsor_name}</span>
          </div>
        )}

        {/* Precio */}
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{fmt.format(product.price)}</span>
            {product.price_compare && product.price_compare > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {fmt.format(product.price_compare)}
              </span>
            )}
          </div>
          {product.itbms_applies && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1 py-0">ITBMS</Badge>
              <span className="text-xs text-muted-foreground">
                {fmt.format(product.price_with_itbms)} con impuesto
              </span>
            </div>
          )}
        </div>

        {/* Rating */}
        {product.rating_count > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.round(product.rating_avg)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">({product.rating_count})</span>
          </div>
        )}

        {/* Stock bajo */}
        {isLowStock && (
          <p className="text-xs text-red-600 font-medium">
            ⚠ Últimas {product.stock_qty} unidades
          </p>
        )}

        {/* Entrega estimada */}
        {product.delivery_available && (
          <p className="text-xs text-muted-foreground">
            Entrega en {product.delivery_days_min}–{product.delivery_days_max} días
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Link href={`/dashboard/marketplace/${product.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Ver detalle
            </Button>
          </Link>
          <Button size="sm" className="text-xs">
            <ShoppingBagIcon className="h-3.5 w-3.5 mr-1" />
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
