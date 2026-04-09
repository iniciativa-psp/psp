import { createClient } from '@/lib/supabase/server'
import type {
  EconomicSector,
  EconomicAgentType,
  StrategicService,
  ActorEconomicProfile,
  EconomicStats,
  EconomicActorSummary,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

/** Devuelve los sectores económicos activos. */
export async function getEconomicSectors(): Promise<EconomicSector[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('economic_sectors')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`getEconomicSectors: ${error.message}`)
  return data ?? []
}

/** Devuelve los tipos de agentes económicos activos. */
export async function getEconomicAgentTypes(): Promise<EconomicAgentType[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('economic_agent_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`getEconomicAgentTypes: ${error.message}`)
  return data ?? []
}

/** Devuelve los servicios estratégicos activos. */
export async function getStrategicServices(): Promise<StrategicService[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategic_services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`getStrategicServices: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Perfil económico de actores
// ---------------------------------------------------------------------------

/** Devuelve el perfil económico de un actor por su actor_id. */
export async function getActorEconomicProfile(
  actorId: string,
): Promise<ActorEconomicProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actor_economic_profiles')
    .select('*')
    .eq('actor_id', actorId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getActorEconomicProfile: ${error.message}`)
  }
  return data
}

/** Crea o actualiza (upsert) el perfil económico de un actor. */
export async function upsertActorEconomicProfile(
  actorId: string,
  payload: Omit<ActorEconomicProfile, 'id' | 'actor_id' | 'created_at' | 'updated_at'>,
): Promise<ActorEconomicProfile> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actor_economic_profiles')
    .upsert({ ...payload, actor_id: actorId }, { onConflict: 'actor_id' })
    .select()
    .single()

  if (error) throw new Error(`upsertActorEconomicProfile: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Vista consolidada de actores económicos (v_economic_actors_summary)
// ---------------------------------------------------------------------------

/** Devuelve una lista paginada de actores económicos desde la vista consolidada. */
export async function getEconomicActorsSummary(opts?: {
  search?: string
  sectorCode?: string
  agentTypeCode?: string
  formalizationStatus?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<EconomicActorSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_economic_actors_summary')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.search) {
    query = query.ilike('actor_full_name', `%${opts.search}%`)
  }
  if (opts?.sectorCode) {
    query = query.eq('primary_sector_code', opts.sectorCode)
  }
  if (opts?.agentTypeCode) {
    query = query.eq('agent_type_code', opts.agentTypeCode)
  }
  if (opts?.formalizationStatus) {
    query = query.eq('formalization_status', opts.formalizationStatus)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`getEconomicActorsSummary: ${error.message}`)

  const total = count ?? 0
  return {
    data: (data ?? []) as EconomicActorSummary[],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve el resumen económico de un actor por su actor_id. */
export async function getEconomicActorSummaryByActor(
  actorId: string,
): Promise<EconomicActorSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_economic_actors_summary')
    .select('*')
    .eq('actor_id', actorId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getEconomicActorSummaryByActor: ${error.message}`)
  }
  return data as EconomicActorSummary
}

// ---------------------------------------------------------------------------
// Estadísticas de desarrollo económico
// ---------------------------------------------------------------------------

/** Devuelve estadísticas del módulo de desarrollo económico. */
export async function getEconomicStats(): Promise<EconomicStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_economic_actors_summary')
    .select('agent_type_code, primary_sector_code, formalization_status')

  if (error) throw new Error(`getEconomicStats: ${error.message}`)

  const rows = data ?? []

  const bySector: Record<string, number> = {}
  const byAgentType: Record<string, number> = {}
  const byFormalization: Record<string, number> = {}

  for (const row of rows) {
    if (row.primary_sector_code) {
      bySector[row.primary_sector_code] = (bySector[row.primary_sector_code] ?? 0) + 1
    }
    if (row.agent_type_code) {
      byAgentType[row.agent_type_code] = (byAgentType[row.agent_type_code] ?? 0) + 1
    }
    if (row.formalization_status) {
      byFormalization[row.formalization_status] =
        (byFormalization[row.formalization_status] ?? 0) + 1
    }
  }

  return {
    by_sector: bySector,
    by_agent_type: byAgentType,
    by_formalization: byFormalization,
    total_economic_actors: rows.length,
  }
}
