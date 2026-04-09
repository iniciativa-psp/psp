'use client'

import { useState, useTransition, useRef } from 'react'
import { slugify } from '@/lib/utils'
import { createProductAction, updateProductAction } from '@/lib/marketplace/actions'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  MarketplaceProduct,
  MarketplaceCategory,
  MarketplaceProductType,
} from '@/types'

interface EconomicSector {
  id: number
  name: string
}

interface TerritorialItem {
  id: number
  name: string
  type: string
}

interface Actor {
  id: string
  full_name: string
}

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product?: MarketplaceProduct | null
  categories?: MarketplaceCategory[]
  sectors?: EconomicSector[]
  territories?: TerritorialItem[]
  sellers?: Actor[]
  onSuccess?: (id: string) => void
}

type Tab = 'general' | 'precios' | 'logistica' | 'marketing'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'Información General' },
  { key: 'precios', label: 'Precios e Inventario' },
  { key: 'logistica', label: 'Logística' },
  { key: 'marketing', label: 'SEO y Marketing' },
]

const PRODUCT_TYPES: { value: MarketplaceProductType; label: string }[] = [
  { value: 'product', label: 'Producto' },
  { value: 'service', label: 'Servicio' },
  { value: 'digital', label: 'Digital' },
  { value: 'agricultural', label: 'Agrícola' },
  { value: 'artisanal', label: 'Artesanal' },
]

export function ProductForm({
  open,
  onClose,
  product,
  categories = [],
  sectors = [],
  territories = [],
  sellers = [],
  onSuccess,
}: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Controlled fields that need live computation
  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [itbmsApplies, setItbmsApplies] = useState(product?.itbms_applies ?? false)
  const [stockUnlimited, setStockUnlimited] = useState(product?.stock_unlimited ?? false)
  const [deliveryAvailable, setDeliveryAvailable] = useState(product?.delivery_available ?? true)
  const [pickupAvailable, setPickupAvailable] = useState(product?.pickup_available ?? true)
  const [featured, setFeatured] = useState(product?.featured ?? false)

  function handleNameChange(value: string) {
    setName(value)
    if (!product) {
      setSlug(slugify(value))
    }
  }

  function handleSubmit(status: 'draft' | 'active') {
    setError(null)
    startTransition(async () => {
      if (!formRef.current) return
      const fd = new FormData(formRef.current)
      fd.set('status', status)
      fd.set('slug', slug)

      if (product) {
      const updateResult = await updateProductAction(product.id, fd)
      if (!updateResult.success) {
        setError(updateResult.error ?? 'Error desconocido')
        return
      }
      onSuccess?.(product.id)
    } else {
      const createResult = await createProductAction(fd)
      if (!createResult.success) {
        setError(createResult.error ?? 'Error desconocido')
        return
      }
      onSuccess?.(createResult.id ?? '')
    }

    onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b pb-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form ref={formRef} className="space-y-4">
          {/* ─── Tab 1: Información General ─── */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="product_type">Tipo de producto</Label>
                <select
                  id="product_type"
                  name="product_type"
                  defaultValue={product?.product_type ?? 'product'}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="category_id">Categoría</Label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={product?.category_id ?? ''}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="economic_sector_id">Sector económico</Label>
                <select
                  id="economic_sector_id"
                  name="economic_sector_id"
                  defaultValue={product?.economic_sector_id ?? ''}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin sector</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="seller_id">Vendedor *</Label>
                <select
                  id="seller_id"
                  name="seller_id"
                  defaultValue={product?.seller_id ?? ''}
                  required
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar vendedor</option>
                  {sellers.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="territorial_id">Territorio</Label>
                <select
                  id="territorial_id"
                  name="territorial_id"
                  defaultValue={product?.territorial_id ?? ''}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin territorio</option>
                  {territories.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="short_description">Descripción corta (máx 500 caracteres)</Label>
                <textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={product?.short_description ?? ''}
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción completa</Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description ?? ''}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <Label htmlFor="main_image_url">URL imagen principal</Label>
                <Input
                  id="main_image_url"
                  name="main_image_url"
                  type="url"
                  defaultValue={product?.main_image_url ?? ''}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (separados por coma)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={product?.tags?.join(', ') ?? ''}
                  placeholder="orgánico, fresco, local"
                />
              </div>
            </div>
          )}

          {/* ─── Tab 2: Precios e Inventario ─── */}
          {activeTab === 'precios' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={product?.price ?? ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price_compare">Precio comparación</Label>
                  <Input
                    id="price_compare"
                    name="price_compare"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={product?.price_compare ?? ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={product?.currency ?? 'USD'}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="unit">Unidad (kg, lb, unidad…)</Label>
                  <Input
                    id="unit"
                    name="unit"
                    defaultValue={product?.unit ?? ''}
                    placeholder="unidad"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="min_order_qty">Cantidad mínima de pedido</Label>
                <Input
                  id="min_order_qty"
                  name="min_order_qty"
                  type="number"
                  min={1}
                  defaultValue={product?.min_order_qty ?? 1}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="itbms_applies"
                  name="itbms_applies"
                  type="checkbox"
                  checked={itbmsApplies}
                  onChange={e => setItbmsApplies(e.target.checked)}
                  value="true"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="itbms_applies">¿Aplica ITBMS?</Label>
              </div>

              {itbmsApplies && (
                <div>
                  <Label htmlFor="itbms_rate">Tasa ITBMS (%)</Label>
                  <Input
                    id="itbms_rate"
                    name="itbms_rate"
                    type="number"
                    step="0.01"
                    defaultValue={product?.itbms_rate ?? 7}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="stock_unlimited"
                  name="stock_unlimited"
                  type="checkbox"
                  checked={stockUnlimited}
                  onChange={e => setStockUnlimited(e.target.checked)}
                  value="true"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="stock_unlimited">Stock ilimitado</Label>
              </div>

              {!stockUnlimited && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="stock_qty">Stock</Label>
                    <Input
                      id="stock_qty"
                      name="stock_qty"
                      type="number"
                      min={0}
                      defaultValue={product?.stock_qty ?? 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="low_stock_threshold">Umbral de bajo stock</Label>
                    <Input
                      id="low_stock_threshold"
                      name="low_stock_threshold"
                      type="number"
                      min={0}
                      defaultValue={product?.low_stock_threshold ?? 5}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab 3: Logística ─── */}
          {activeTab === 'logistica' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="delivery_available"
                  name="delivery_available"
                  type="checkbox"
                  checked={deliveryAvailable}
                  onChange={e => setDeliveryAvailable(e.target.checked)}
                  value="true"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="delivery_available">¿Delivery disponible?</Label>
              </div>

              {deliveryAvailable && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="delivery_days_min">Días mínimos de entrega</Label>
                    <Input
                      id="delivery_days_min"
                      name="delivery_days_min"
                      type="number"
                      min={1}
                      defaultValue={product?.delivery_days_min ?? 1}
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery_days_max">Días máximos de entrega</Label>
                    <Input
                      id="delivery_days_max"
                      name="delivery_days_max"
                      type="number"
                      min={1}
                      defaultValue={product?.delivery_days_max ?? 5}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="pickup_available"
                  name="pickup_available"
                  type="checkbox"
                  checked={pickupAvailable}
                  onChange={e => setPickupAvailable(e.target.checked)}
                  value="true"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="pickup_available">¿Pickup disponible?</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight_kg">Peso (kg)</Label>
                  <Input
                    id="weight_kg"
                    name="weight_kg"
                    type="number"
                    step="0.001"
                    min={0}
                    defaultValue={product?.weight_kg ?? ''}
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions_cm">Dimensiones (LxAxA cm)</Label>
                  <Input
                    id="dimensions_cm"
                    name="dimensions_cm"
                    defaultValue={product?.dimensions_cm ?? ''}
                    placeholder="30x20x10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab 4: SEO y Marketing ─── */}
          {activeTab === 'marketing' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="slug">Slug (URL amigable)</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku ?? ''}
                  placeholder="PRD-001"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="featured"
                  name="featured"
                  type="checkbox"
                  checked={featured}
                  onChange={e => setFeatured(e.target.checked)}
                  value="true"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="featured">¿Producto destacado?</Label>
              </div>

              {featured && (
                <div>
                  <Label htmlFor="featured_until">Fecha límite de destacado</Label>
                  <Input
                    id="featured_until"
                    name="featured_until"
                    type="date"
                    defaultValue={product?.featured_until?.slice(0, 10) ?? ''}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="sponsor_actor_id">Actor patrocinador</Label>
                <select
                  id="sponsor_actor_id"
                  name="sponsor_actor_id"
                  defaultValue={product?.sponsor_actor_id ?? ''}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin patrocinador</option>
                  {sellers.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sponsor_display_size">Tamaño de logo patrocinador</Label>
                <select
                  id="sponsor_display_size"
                  name="sponsor_display_size"
                  defaultValue={product?.sponsor_display_size ?? 'small'}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="small">Pequeño (h-4)</option>
                  <option value="medium">Mediano (h-6)</option>
                  <option value="large">Grande (h-8)</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={isPending}
            >
              {isPending ? 'Guardando…' : 'Borrador'}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('active')}
              disabled={isPending}
            >
              {isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
