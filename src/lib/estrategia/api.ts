import { createClient } from '@/lib/supabase/server'
import type {
  StrategyItem,
  StrategyLevel,
  StrategyStatus,
  StrategySummary,
  StrategyTreeNode,
  StrategyBudgetSummary,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Estrategia – ítems
// ---------------------------------------------------------------------------

/** Devuelve ítems estratégicos (vista de resumen) con filtros y paginación. */
export async function getStrategyItems(opts?: {
  level?: StrategyLevel
  status?: StrategyStatus
  territorialId?: number
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<StrategySummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_strategy_summary')
    .select('*', { count: 'exact' })
    .order('code')
    .range(from, to)

  if (opts?.isActive !== undefined) {
    query = query.eq('is_active', opts.isActive)
  }
  if (opts?.level) {
    query = query.eq('level', opts.level)
  }
  if (opts?.status) {
    query = query.eq('status', opts.status)
  }
  if (opts?.territorialId) {
    query = query.eq('territorial_id', opts.territorialId)
  }
  if (opts?.search) {
    query = query.or(
      `name.ilike.%${opts.search}%,code.ilike.%${opts.search}%`,
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getStrategyItems: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un ítem estratégico por ID (desde la vista de resumen). */
export async function getStrategyItem(id: string): Promise<StrategySummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_strategy_summary')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getStrategyItem: ${error.message}`)
  }
  return data
}

/** Crea un nuevo ítem estratégico. */
export async function createStrategyItem(
  payload: Omit<StrategyItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<StrategyItem> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_items')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createStrategyItem: ${error.message}`)
  return data
}

/** Actualiza un ítem estratégico existente. */
export async function updateStrategyItem(
  id: string,
  payload: Partial<Omit<StrategyItem, 'id' | 'created_at' | 'updated_at'>>,
): Promise<StrategyItem> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateStrategyItem: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Árbol y presupuesto
// ---------------------------------------------------------------------------

/** Devuelve el árbol recursivo de un ítem estratégico raíz. */
export async function getStrategyTree(rootId: string): Promise<StrategyTreeNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_strategy_tree', {
    root_id: rootId,
  })

  if (error) throw new Error(`getStrategyTree: ${error.message}`)
  return data ?? []
}

/** Devuelve el resumen de presupuesto recursivo para un plan. */
export async function getStrategyBudgetSummary(planId: string): Promise<StrategyBudgetSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_strategy_budget_summary', {
    plan_id: planId,
  })

  if (error) throw new Error(`getStrategyBudgetSummary: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Devuelve conteos de ítems estratégicos agrupados por nivel y estado. */
export async function getStrategyStats(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_items')
    .select('level, status')
    .eq('is_active', true)

  if (error) throw new Error(`getStrategyStats: ${error.message}`)

  const stats: Record<string, number> = {}
  for (const row of data ?? []) {
    const levelKey = `level_${row.level}`
    const statusKey = `status_${row.status}`
    stats[levelKey] = (stats[levelKey] ?? 0) + 1
    stats[statusKey] = (stats[statusKey] ?? 0) + 1
    stats['total'] = (stats['total'] ?? 0) + 1
  }
  return stats
}

// ---------------------------------------------------------------------------
// Bitácora de estados
// ---------------------------------------------------------------------------

export interface StrategyStatusLogEntry {
  id: number
  strategy_id: string
  old_status: string | null
  new_status: string
  changed_by: string | null
  notes: string | null
  changed_at: string
}

/** Devuelve el historial de cambios de estado de un ítem estratégico. */
export async function getStatusLog(strategyId: string): Promise<StrategyStatusLogEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('strategy_status_log')
    .select('*')
    .eq('strategy_id', strategyId)
    .order('changed_at', { ascending: false })

  if (error) throw new Error(`getStatusLog: ${error.message}`)
  return data ?? []
}

