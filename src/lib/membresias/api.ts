import { createClient } from '@/lib/supabase/server'
import type {
  MembershipPlan,
  Membership,
  MembershipSummary,
  MembershipMetrics,
  MembershipInvoice,
  MembresiaStats,
  PaginatedResponse,
  MembershipStatus,
} from '@/types'

// ---------------------------------------------------------------------------
// Planes de membresía
// ---------------------------------------------------------------------------

/** Devuelve los planes de membresía con filtros y paginación opcionales. */
export async function getMembershipPlans(opts?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<MembershipPlan>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('membership_plans')
    .select('*', { count: 'exact' })
    .order('sort_order')
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)

  const { data, error, count } = await query
  if (error) throw new Error(`getMembershipPlans: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ---------------------------------------------------------------------------
// Membresías / Suscripciones
// ---------------------------------------------------------------------------

/** Devuelve membresías desde la vista de resumen con filtros y paginación. */
export async function getMemberships(opts?: {
  actorId?: string
  status?: MembershipStatus
  planId?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<MembershipSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_memberships_summary')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.actorId) query = query.eq('actor_id', opts.actorId)
  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.planId) query = query.eq('plan_id', opts.planId)
  if (opts?.search) query = query.ilike('actor_full_name', `%${opts.search}%`)

  const { data, error, count } = await query
  if (error) throw new Error(`getMemberships: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve una membresía por ID. */
export async function getMembership(id: string): Promise<MembershipSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_memberships_summary')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getMembership: ${error.message}`)
  }
  return data
}

/** Crea una nueva membresía. */
export async function createMembership(
  payload: Omit<Membership, 'id' | 'created_at' | 'updated_at'>,
): Promise<Membership> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createMembership: ${error.message}`)
  return data
}

/** Actualiza campos de una membresía. */
export async function updateMembership(
  id: string,
  payload: Partial<Omit<Membership, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Membership> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateMembership: ${error.message}`)
  return data
}

/** Actualiza el estado de una membresía y registra las notas. */
export async function updateMembershipStatus(
  id: string,
  status: MembershipStatus,
  notes?: string,
): Promise<Membership> {
  return updateMembership(id, { status, cancel_reason: notes ?? null })
}

// ---------------------------------------------------------------------------
// Facturas / Historial de pagos
// ---------------------------------------------------------------------------

/** Devuelve las facturas de una membresía. */
export async function getMembershipInvoices(membershipId: string): Promise<MembershipInvoice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_invoices')
    .select('*')
    .eq('membership_id', membershipId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getMembershipInvoices: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Estadísticas / KPIs
// ---------------------------------------------------------------------------

/** Devuelve métricas globales del módulo de membresías. */
export async function getMembershipMetrics(): Promise<MembershipMetrics> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_membership_metrics')

  if (error) throw new Error(`getMembershipMetrics: ${error.message}`)

  const row = Array.isArray(data) ? data[0] : data
  return {
    activas: row?.activas ?? 0,
    por_vencer_7_dias: row?.por_vencer_7_dias ?? 0,
    vencidas: row?.vencidas ?? 0,
    en_mora: row?.en_mora ?? 0,
    mrr: row?.mrr ?? 0,
  }
}

/** Devuelve estadísticas extendidas: ingresos del mes, año, por plan y tasa de renovación. */
export async function getMembresiaStats(): Promise<MembresiaStats> {
  const supabase = await createClient()

  // Activos + MRR base
  const metricsPromise = supabase.rpc('get_membership_metrics')

  // Ingresos facturados del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const [revenueMonthRes, revenueYearRes, byPlanRes, renewalRes] = await Promise.all([
    supabase
      .from('membership_invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', monthStart),
    supabase
      .from('membership_invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', yearStart),
    supabase
      .from('v_memberships_summary')
      .select('plan_name, status')
      .eq('status', 'active'),
    supabase
      .from('memberships')
      .select('auto_renew, status')
      .eq('status', 'active'),
  ])

  const { data: metricsData, error: metricsError } = await metricsPromise
  if (metricsError) throw new Error(`getMembresiaStats: ${metricsError.message}`)
  const row = Array.isArray(metricsData) ? metricsData[0] : metricsData

  const totalActive: number = Number(row?.activas ?? 0)

  const revenueMonth = (revenueMonthRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total ?? 0),
    0,
  )
  const revenueYear = (revenueYearRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total ?? 0),
    0,
  )

  const byPlan: Record<string, number> = {}
  for (const item of byPlanRes.data ?? []) {
    const key = item.plan_name as string
    byPlan[key] = (byPlan[key] ?? 0) + 1
  }

  const renewalRows = renewalRes.data ?? []
  const autoRenewCount = renewalRows.filter(r => r.auto_renew).length
  const renewalRate =
    renewalRows.length > 0 ? Math.round((autoRenewCount / renewalRows.length) * 100) : 0

  return {
    total_active: totalActive,
    total_revenue_month: revenueMonth,
    total_revenue_year: revenueYear,
    by_plan: byPlan,
    renewal_rate: renewalRate,
  }
}
