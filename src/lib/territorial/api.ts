import { createClient } from '@/lib/supabase/server'
import type {
  TerritorialItem,
  TerritorialItemView,
  DistrictView,
  CorregimientoView,
  TerritorialType,
} from '@/types'

// ---------------------------------------------------------------------------
// Provincias
// ---------------------------------------------------------------------------

/** Devuelve todas las provincias activas. */
export async function getProvincias(): Promise<TerritorialItemView[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_provincias')
    .select('*')

  if (error) throw new Error(`getProvincias: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Distritos
// ---------------------------------------------------------------------------

/** Devuelve distritos, opcionalmente filtrados por provincia. */
export async function getDistritos(
  provinceId?: number,
): Promise<DistrictView[]> {
  const supabase = await createClient()
  let query = supabase.from('v_distritos').select('*')

  if (provinceId) {
    query = query.eq('province_id', provinceId)
  }

  const { data, error } = await query
  if (error) throw new Error(`getDistritos: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Corregimientos
// ---------------------------------------------------------------------------

/** Devuelve corregimientos, opcionalmente filtrados por distrito. */
export async function getCorregimientos(
  districtId?: number,
): Promise<CorregimientoView[]> {
  const supabase = await createClient()
  let query = supabase.from('v_corregimientos').select('*')

  if (districtId) {
    query = query.eq('district_id', districtId)
  }

  const { data, error } = await query
  if (error) throw new Error(`getCorregimientos: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Ítem individual y cadena jerárquica
// ---------------------------------------------------------------------------

/** Devuelve un ítem territorial por ID. */
export async function getTerritorialItem(
  id: number,
): Promise<TerritorialItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('territorial_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(`getTerritorialItem: ${error.message}`)
  }
  return data
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------

/** Busca ítems territoriales por texto libre. */
export async function searchTerritorial(
  query: string,
  type?: TerritorialType,
  limit = 20,
): Promise<TerritorialItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_territorial', {
    p_query: query,
    p_type: type ?? null,
    p_limit: limit,
  })

  if (error) throw new Error(`searchTerritorial: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Devuelve el conteo de ítems activos por tipo. */
export async function getTerritorialStats(): Promise<Record<TerritorialType, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('territorial_items')
    .select('type')
    .eq('is_active', true)

  if (error) throw new Error(`getTerritorialStats: ${error.message}`)

  const stats: Record<string, number> = {
    province: 0,
    district: 0,
    corregimiento: 0,
    community: 0,
  }
  for (const row of data ?? []) {
    stats[row.type] = (stats[row.type] ?? 0) + 1
  }
  return stats as Record<TerritorialType, number>
}
