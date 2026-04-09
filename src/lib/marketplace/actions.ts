'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createMarketplaceProduct, updateMarketplaceProduct } from '@/lib/marketplace/api'
import { slugify } from '@/lib/utils'
import type { MarketplaceProductStatus, MarketplaceOrderStatus, MarketplaceProductType } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: FormDataEntryValue | null): string | null {
  const s = value as string | null
  return s?.trim() || null
}

function num(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

function int(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const n = parseInt(value, 10)
  return isNaN(n) ? null : n
}

function bool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1'
}

// ---------------------------------------------------------------------------
// Product Actions
// ---------------------------------------------------------------------------

export async function createProductAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const name = str(formData.get('name'))
    if (!name) return { success: false, error: 'El nombre del producto es obligatorio.' }

    const rawSlug = str(formData.get('slug')) || slugify(name)
    const seller_id = str(formData.get('seller_id'))
    if (!seller_id) return { success: false, error: 'El vendedor es obligatorio.' }

    const price = num(formData.get('price'))
    if (price === null) return { success: false, error: 'El precio es obligatorio.' }

    const tagsRaw = str(formData.get('tags'))
    const tags: string[] = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

    const imagesRaw = str(formData.get('images'))
    const images: string[] = imagesRaw ? imagesRaw.split('\n').map(u => u.trim()).filter(Boolean) : []

    const payload = {
      seller_id,
      category_id: str(formData.get('category_id')),
      strategy_item_id: str(formData.get('strategy_item_id')),
      territorial_id: int(formData.get('territorial_id')),
      economic_sector_id: int(formData.get('economic_sector_id')),
      sku: str(formData.get('sku')),
      name,
      slug: rawSlug,
      short_description: str(formData.get('short_description')),
      description: str(formData.get('description')),
      product_type: (str(formData.get('product_type')) ?? 'product') as MarketplaceProductType,
      price,
      price_compare: num(formData.get('price_compare')),
      currency: str(formData.get('currency')) ?? 'USD',
      unit: str(formData.get('unit')),
      min_order_qty: int(formData.get('min_order_qty')) ?? 1,
      itbms_applies: bool(formData.get('itbms_applies')),
      itbms_rate: num(formData.get('itbms_rate')) ?? 7.0,
      stock_qty: int(formData.get('stock_qty')) ?? 0,
      stock_unlimited: bool(formData.get('stock_unlimited')),
      low_stock_threshold: int(formData.get('low_stock_threshold')) ?? 5,
      main_image_url: str(formData.get('main_image_url')),
      images,
      video_url: str(formData.get('video_url')),
      delivery_available: bool(formData.get('delivery_available')),
      delivery_days_min: int(formData.get('delivery_days_min')) ?? 1,
      delivery_days_max: int(formData.get('delivery_days_max')) ?? 5,
      pickup_available: bool(formData.get('pickup_available')),
      weight_kg: num(formData.get('weight_kg')),
      dimensions_cm: str(formData.get('dimensions_cm')),
      status: (str(formData.get('status')) ?? 'draft') as MarketplaceProductStatus,
      tags,
      featured: bool(formData.get('featured')),
      featured_until: str(formData.get('featured_until')),
      sponsor_actor_id: str(formData.get('sponsor_actor_id')),
      sponsor_display_size: str(formData.get('sponsor_display_size')) ?? 'small',
      is_active: true,
      created_by: null,
    }

    const product = await createMarketplaceProduct(payload)
    revalidatePath('/dashboard/marketplace')
    return { success: true, id: product.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el producto'
    return { success: false, error: message }
  }
}

export async function updateProductAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const name = str(formData.get('name'))
    if (!name) return { success: false, error: 'El nombre del producto es obligatorio.' }

    const rawSlug = str(formData.get('slug')) || slugify(name)

    const tagsRaw = str(formData.get('tags'))
    const tags: string[] = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

    const imagesRaw = str(formData.get('images'))
    const images: string[] = imagesRaw ? imagesRaw.split('\n').map(u => u.trim()).filter(Boolean) : []

    const payload = {
      category_id: str(formData.get('category_id')),
      strategy_item_id: str(formData.get('strategy_item_id')),
      territorial_id: int(formData.get('territorial_id')),
      economic_sector_id: int(formData.get('economic_sector_id')),
      sku: str(formData.get('sku')),
      name,
      slug: rawSlug,
      short_description: str(formData.get('short_description')),
      description: str(formData.get('description')),
      product_type: str(formData.get('product_type')) as MarketplaceProductType,
      price: num(formData.get('price')) ?? 0,
      price_compare: num(formData.get('price_compare')),
      currency: str(formData.get('currency')) ?? 'USD',
      unit: str(formData.get('unit')),
      min_order_qty: int(formData.get('min_order_qty')) ?? 1,
      itbms_applies: bool(formData.get('itbms_applies')),
      itbms_rate: num(formData.get('itbms_rate')) ?? 7.0,
      stock_qty: int(formData.get('stock_qty')) ?? 0,
      stock_unlimited: bool(formData.get('stock_unlimited')),
      low_stock_threshold: int(formData.get('low_stock_threshold')) ?? 5,
      main_image_url: str(formData.get('main_image_url')),
      images,
      video_url: str(formData.get('video_url')),
      delivery_available: bool(formData.get('delivery_available')),
      delivery_days_min: int(formData.get('delivery_days_min')) ?? 1,
      delivery_days_max: int(formData.get('delivery_days_max')) ?? 5,
      pickup_available: bool(formData.get('pickup_available')),
      weight_kg: num(formData.get('weight_kg')),
      dimensions_cm: str(formData.get('dimensions_cm')),
      status: str(formData.get('status')) as MarketplaceProductStatus,
      tags,
      featured: bool(formData.get('featured')),
      featured_until: str(formData.get('featured_until')),
      sponsor_actor_id: str(formData.get('sponsor_actor_id')),
      sponsor_display_size: str(formData.get('sponsor_display_size')) ?? 'small',
    }

    await updateMarketplaceProduct(id, payload)
    revalidatePath('/dashboard/marketplace')
    revalidatePath(`/dashboard/marketplace/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el producto'
    return { success: false, error: message }
  }
}

export async function changeProductStatusAction(
  id: string,
  status: MarketplaceProductStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateMarketplaceProduct(id, { status })
    revalidatePath('/dashboard/marketplace')
    revalidatePath(`/dashboard/marketplace/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cambiar el estado del producto'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Order Actions
// ---------------------------------------------------------------------------

export async function createOrderAction(payload: {
  items: Array<{ product_id: string; quantity: number }>
  buyer_id: string
  delivery_type: string
  delivery_address?: string
  notes?: string
}): Promise<{ success: boolean; error?: string; order_id?: string; order_number?: string }> {
  try {
    const supabase = await createClient()

    // Generate order number
    const { data: orderNumData, error: numErr } = await supabase
      .rpc('generate_order_number')
    if (numErr) throw new Error(`generate_order_number: ${numErr.message}`)
    const order_number = orderNumData as string

    // Fetch product prices
    const productIds = payload.items.map(i => i.product_id)
    const { data: products, error: prodErr } = await supabase
      .from('marketplace_products')
      .select('id, price, itbms_applies, itbms_rate, seller_id, name, main_image_url')
      .in('id', productIds)
    if (prodErr) throw new Error(`createOrderAction fetch products: ${prodErr.message}`)

    const productMap = new Map((products ?? []).map(p => [p.id, p]))

    let subtotal = 0
    let itbms_amount = 0

    const orderItems = payload.items.map(item => {
      const product = productMap.get(item.product_id)
      if (!product) throw new Error(`Producto ${item.product_id} no encontrado`)

      const unit_price = Number(product.price)
      const rate = product.itbms_applies ? Number(product.itbms_rate) : 0
      const item_itbms = Number((unit_price * item.quantity * rate / 100).toFixed(2))
      const line_total = Number((unit_price * item.quantity + item_itbms).toFixed(2))

      subtotal += unit_price * item.quantity
      itbms_amount += item_itbms

      return {
        product_id: item.product_id,
        seller_id: product.seller_id,
        quantity: item.quantity,
        unit_price,
        itbms_rate: rate,
        itbms_amount: item_itbms,
        line_total,
        product_snapshot: {
          name: product.name,
          price: unit_price,
          main_image_url: product.main_image_url,
        },
        status: 'pending',
      }
    })

    const total = Number((subtotal + itbms_amount).toFixed(2))

    const { data: order, error: orderErr } = await supabase
      .from('marketplace_orders')
      .insert({
        order_number,
        buyer_id: payload.buyer_id,
        status: 'pending',
        subtotal: Number(subtotal.toFixed(2)),
        itbms_amount,
        total,
        currency: 'USD',
        delivery_type: payload.delivery_type,
        delivery_address: payload.delivery_address ?? null,
        notes: payload.notes ?? null,
      })
      .select()
      .single()

    if (orderErr) throw new Error(`createOrderAction insert order: ${orderErr.message}`)

    const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }))
    const { error: itemsErr } = await supabase
      .from('marketplace_order_items')
      .insert(itemsWithOrderId)
    if (itemsErr) throw new Error(`createOrderAction insert items: ${itemsErr.message}`)

    revalidatePath('/dashboard/marketplace')
    revalidatePath('/dashboard/marketplace/pedidos')
    return { success: true, order_id: order.id, order_number: order.order_number }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el pedido'
    return { success: false, error: message }
  }
}

export async function updateOrderStatusAction(
  id: string,
  status: MarketplaceOrderStatus,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('marketplace_orders')
      .update({ status, ...(notes ? { notes } : {}) })
      .eq('id', id)

    if (error) throw new Error(`updateOrderStatusAction: ${error.message}`)

    revalidatePath('/dashboard/marketplace')
    revalidatePath(`/dashboard/marketplace/${id}`)
    revalidatePath('/dashboard/marketplace/pedidos')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el estado del pedido'
    return { success: false, error: message }
  }
}
