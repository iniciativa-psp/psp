import { createClient } from '@/lib/supabase/server'
import type {
  MarketplaceCategory,
  MarketplaceProduct,
  MarketplaceProductSummary,
  MarketplaceOrderSummary,
  MarketplaceCartItem,
  PaginatedResponse,
  MarketplaceProductStatus,
  MarketplaceOrderStatus,
  MarketplaceProductType,
} from '@/types'

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`getMarketplaceCategories: ${error.message}`)
  return (data ?? []) as MarketplaceCategory[]
}

export async function getMarketplaceCategoryTree(): Promise<
  (MarketplaceCategory & { children: MarketplaceCategory[] })[]
> {
  const categories = await getMarketplaceCategories()
  const roots = categories.filter(c => c.parent_id === null)
  return roots.map(root => ({
    ...root,
    children: categories.filter(c => c.parent_id === root.id),
  }))
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export async function getMarketplaceProducts(opts?: {
  search?: string
  categoryId?: string
  sellerId?: string
  productType?: MarketplaceProductType
  status?: MarketplaceProductStatus
  minPrice?: number
  maxPrice?: number
  territorialId?: number
  featured?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<MarketplaceProductSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_marketplace_products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.search) {
    query = query.or(`name.ilike.%${opts.search}%,short_description.ilike.%${opts.search}%`)
  }
  if (opts?.categoryId) query = query.eq('category_id', opts.categoryId)
  if (opts?.sellerId) query = query.eq('seller_id', opts.sellerId)
  if (opts?.productType) query = query.eq('product_type', opts.productType)
  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.minPrice !== undefined) query = query.gte('price', opts.minPrice)
  if (opts?.maxPrice !== undefined) query = query.lte('price', opts.maxPrice)
  if (opts?.territorialId !== undefined) query = query.eq('territorial_id', opts.territorialId)
  if (opts?.featured !== undefined) query = query.eq('featured', opts.featured)

  const { data, error, count } = await query
  if (error) throw new Error(`getMarketplaceProducts: ${error.message}`)

  const total = count ?? 0
  return {
    data: (data ?? []) as MarketplaceProductSummary[],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getMarketplaceProduct(id: string): Promise<MarketplaceProductSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_marketplace_products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getMarketplaceProduct: ${error.message}`)
  }
  return data as MarketplaceProductSummary
}

export async function getMarketplaceProductBySlug(slug: string): Promise<MarketplaceProductSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_marketplace_products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getMarketplaceProductBySlug: ${error.message}`)
  }
  return data as MarketplaceProductSummary
}

export async function createMarketplaceProduct(
  payload: Omit<MarketplaceProduct, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'orders_count' | 'rating_avg' | 'rating_count'>,
): Promise<MarketplaceProduct> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_products')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createMarketplaceProduct: ${error.message}`)
  return data as MarketplaceProduct
}

export async function updateMarketplaceProduct(
  id: string,
  payload: Partial<Omit<MarketplaceProduct, 'id' | 'created_at' | 'updated_at'>>,
): Promise<MarketplaceProduct> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateMarketplaceProduct: ${error.message}`)
  return data as MarketplaceProduct
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

export async function getMarketplaceStats(): Promise<{
  total_products: number
  active_products: number
  total_orders: number
  pending_orders: number
  total_revenue: number
  total_sellers: number
  featured_products: number
  delivered_orders: number
  by_product_type: Record<string, number>
  by_order_status: Record<string, number>
}> {
  const supabase = await createClient()

  const [productsRes, ordersRes] = await Promise.all([
    supabase.from('marketplace_products').select('status, product_type, featured, seller_id'),
    supabase.from('marketplace_orders').select('status, total'),
  ])

  if (productsRes.error) throw new Error(`getMarketplaceStats products: ${productsRes.error.message}`)
  if (ordersRes.error) throw new Error(`getMarketplaceStats orders: ${ordersRes.error.message}`)

  const products = productsRes.data ?? []
  const orders = ordersRes.data ?? []

  const by_product_type: Record<string, number> = {}
  const sellerSet = new Set<string>()

  for (const p of products) {
    by_product_type[p.product_type] = (by_product_type[p.product_type] ?? 0) + 1
    sellerSet.add(p.seller_id)
  }

  const by_order_status: Record<string, number> = {}
  let total_revenue = 0

  for (const o of orders) {
    by_order_status[o.status] = (by_order_status[o.status] ?? 0) + 1
    if (o.status === 'delivered') total_revenue += Number(o.total)
  }

  return {
    total_products: products.length,
    active_products: products.filter(p => p.status === 'active').length,
    total_orders: orders.length,
    pending_orders: orders.filter(o => o.status === 'pending').length,
    total_revenue,
    total_sellers: sellerSet.size,
    featured_products: products.filter(p => p.featured).length,
    delivered_orders: orders.filter(o => o.status === 'delivered').length,
    by_product_type,
    by_order_status,
  }
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export async function getMarketplaceOrders(opts?: {
  buyerId?: string
  sellerId?: string
  status?: MarketplaceOrderStatus
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<MarketplaceOrderSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_marketplace_orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.buyerId) query = query.eq('buyer_id', opts.buyerId)
  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.search) query = query.or(`order_number.ilike.%${opts.search}%,buyer_name.ilike.%${opts.search}%`)

  const { data, error, count } = await query
  if (error) throw new Error(`getMarketplaceOrders: ${error.message}`)

  const total = count ?? 0
  return {
    data: (data ?? []) as MarketplaceOrderSummary[],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getMarketplaceOrder(id: string): Promise<MarketplaceOrderSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_marketplace_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getMarketplaceOrder: ${error.message}`)
  }
  return data as MarketplaceOrderSummary
}

// ---------------------------------------------------------------------------
// Productos destacados / recientes
// ---------------------------------------------------------------------------

export async function getFeaturedProducts(limit = 6): Promise<MarketplaceProductSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_marketplace_products')
    .select('*')
    .eq('status', 'active')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getFeaturedProducts: ${error.message}`)
  return (data ?? []) as MarketplaceProductSummary[]
}

export async function getRecentProducts(limit = 10): Promise<MarketplaceProductSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_marketplace_products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getRecentProducts: ${error.message}`)
  return (data ?? []) as MarketplaceProductSummary[]
}

// ---------------------------------------------------------------------------
// Order items
// ---------------------------------------------------------------------------

export async function getOrderItems(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_order_items')
    .select('*')
    .eq('order_id', orderId)

  if (error) throw new Error(`getOrderItems: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Order status log
// ---------------------------------------------------------------------------

export async function getOrderStatusLog(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_order_status_log')
    .select('*')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: false })

  if (error) throw new Error(`getOrderStatusLog: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Product orders (últimos pedidos de un producto)
// ---------------------------------------------------------------------------

export async function getProductOrders(productId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_order_items')
    .select('*, marketplace_orders(*)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getProductOrders: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function getCartItems(actorId: string): Promise<MarketplaceCartItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketplace_cart_items')
    .select('*')
    .eq('actor_id', actorId)

  if (error) throw new Error(`getCartItems: ${error.message}`)
  return (data ?? []) as MarketplaceCartItem[]
}
