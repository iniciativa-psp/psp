import { createClient } from '@/lib/supabase/server'
import type {
  Actor,
  ActorRelationship,
  ActorSummary,
  ActorType,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Actores
// ---------------------------------------------------------------------------

/** Devuelve actores (vista de resumen) con filtros y paginación. */
export async function getActors(opts?: {
  search?: string
  actorType?: ActorType
  territorialId?: number
  isActive?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<ActorSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_actors_summary')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(from, to)

  if (opts?.isActive !== undefined) {
    query = query.eq('is_active', opts.isActive)
  }
  if (opts?.actorType) {
    query = query.eq('actor_type', opts.actorType)
  }
  if (opts?.territorialId) {
    query = query.eq('territorial_id', opts.territorialId)
  }
  if (opts?.search) {
    query = query.or(
      `full_name.ilike.%${opts.search}%,legal_name.ilike.%${opts.search}%,id_number.ilike.%${opts.search}%,ruc.ilike.%${opts.search}%,email.ilike.%${opts.search}%`,
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getActors: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un actor por ID. */
export async function getActor(id: string): Promise<Actor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getActor: ${error.message}`)
  }
  return data
}

/** Crea un nuevo actor. */
export async function createActor(
  payload: Omit<Actor, 'id' | 'created_at' | 'updated_at'>,
): Promise<Actor> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actors')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createActor: ${error.message}`)
  return data
}

/** Actualiza un actor existente. */
export async function updateActor(
  id: string,
  payload: Partial<Omit<Actor, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Actor> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actors')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateActor: ${error.message}`)
  return data
}

/** Busca actores mediante la función RPC search_actors. */
export async function searchActors(
  query: string,
  actorType?: ActorType,
  limit = 20,
): Promise<ActorSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_actors', {
    p_query: query,
    p_actor_type: actorType ?? null,
    p_economic_agent: null,
    p_limit: limit,
  })

  if (error) throw new Error(`searchActors: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Relaciones entre actores
// ---------------------------------------------------------------------------

/** Devuelve las relaciones de un actor (como padre o hijo). */
export async function getActorRelationships(
  actorId: string,
): Promise<ActorRelationship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actor_relationships')
    .select('*')
    .or(`parent_actor_id.eq.${actorId},child_actor_id.eq.${actorId}`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getActorRelationships: ${error.message}`)
  return data ?? []
}

/** Crea una nueva relación entre actores. */
export async function createActorRelationship(
  payload: Omit<ActorRelationship, 'id' | 'created_at' | 'updated_at'>,
): Promise<ActorRelationship> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actor_relationships')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createActorRelationship: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Devuelve conteos de actores agrupados por tipo y estado. */
export async function getActorStats(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actors')
    .select('actor_type, status')
    .eq('is_active', true)

  if (error) throw new Error(`getActorStats: ${error.message}`)

  const stats: Record<string, number> = {}
  for (const row of data ?? []) {
    const typeKey = `type_${row.actor_type}`
    const statusKey = `status_${row.status}`
    stats[typeKey] = (stats[typeKey] ?? 0) + 1
    stats[statusKey] = (stats[statusKey] ?? 0) + 1
    stats['total'] = (stats['total'] ?? 0) + 1
  }
  return stats
}
