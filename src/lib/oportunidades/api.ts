import { createClient } from '@/lib/supabase/server'
import type {
  Opportunity,
  OpportunityApplication,
  OpportunitySummary,
  OpportunityType,
  OpportunityStatus,
  OpportunityStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Oportunidades
// ---------------------------------------------------------------------------

/** Devuelve oportunidades (vista de resumen) con filtros y paginación. */
export async function getOpportunities(opts?: {
  type?: OpportunityType
  status?: OpportunityStatus
  territorialId?: number
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<OpportunitySummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_opportunities_summary')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.type) {
    query = query.eq('opportunity_type', opts.type)
  }
  if (opts?.status) {
    query = query.eq('status', opts.status)
  }
  if (opts?.territorialId) {
    query = query.eq('territorial_id', opts.territorialId)
  }
  if (opts?.search) {
    query = query.ilike('title', `%${opts.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getOpportunities: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve una oportunidad por ID. */
export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getOpportunity: ${error.message}`)
  }
  return data
}

/** Crea una nueva oportunidad. */
export async function createOpportunity(
  payload: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>,
): Promise<Opportunity> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createOpportunity: ${error.message}`)
  return data
}

/** Actualiza una oportunidad existente. */
export async function updateOpportunity(
  id: string,
  payload: Partial<Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Opportunity> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateOpportunity: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Postulaciones a oportunidades
// ---------------------------------------------------------------------------

/** Devuelve las postulaciones para una oportunidad. */
export async function getOpportunityApplications(
  opportunityId: string,
): Promise<OpportunityApplication[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunity_applications')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getOpportunityApplications: ${error.message}`)
  return data ?? []
}

/** Crea una nueva postulación a una oportunidad. */
export async function createOpportunityApplication(
  payload: Omit<OpportunityApplication, 'id' | 'created_at' | 'updated_at'>,
): Promise<OpportunityApplication> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunity_applications')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createOpportunityApplication: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Devuelve estadísticas de oportunidades (vía RPC). */
export async function getOpportunityStats(): Promise<OpportunityStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_opportunity_stats')

  if (error) throw new Error(`getOpportunityStats: ${error.message}`)
  return data as OpportunityStats
}
