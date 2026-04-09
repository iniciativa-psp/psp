import { createClient } from '@/lib/supabase/server'
import type {
  Employee,
  PerformanceEvaluation,
  HRStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Empleados
// ---------------------------------------------------------------------------

/** Devuelve empleados con filtros y paginación opcionales. */
export async function getEmployees(opts?: {
  department?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<Employee>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.department) query = query.eq('department', opts.department)
  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.search) {
    query = query.or(
      `position.ilike.%${opts.search}%,employee_code.ilike.%${opts.search}%`,
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getEmployees: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un empleado por ID. */
export async function getEmployee(id: string): Promise<Employee | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getEmployee: ${error.message}`)
  }
  return data
}

/** Crea un nuevo empleado. */
export async function createEmployee(
  payload: Omit<Employee, 'id' | 'created_at' | 'updated_at'>,
): Promise<Employee> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createEmployee: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Evaluaciones de desempeño
// ---------------------------------------------------------------------------

/** Devuelve las evaluaciones de desempeño de un empleado. */
export async function getPerformanceEvaluations(
  employeeId: string,
): Promise<PerformanceEvaluation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('performance_evaluations')
    .select('*')
    .eq('employee_id', employeeId)
    .order('period_year', { ascending: false })

  if (error) throw new Error(`getPerformanceEvaluations: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Estadísticas de RRHH
// ---------------------------------------------------------------------------

/** Devuelve estadísticas generales de RRHH. */
export async function getHRStats(): Promise<HRStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('department, contract_type, status')

  if (error) throw new Error(`getHRStats: ${error.message}`)

  const rows = (data ?? []) as Pick<Employee, 'department' | 'contract_type' | 'status'>[]
  const activeRows = rows.filter((r) => r.status === 'active')

  const byDepartment: Record<string, number> = {}
  const byContractType: Record<string, number> = {}

  for (const row of activeRows) {
    const dept = row.department ?? 'Sin departamento'
    byDepartment[dept] = (byDepartment[dept] ?? 0) + 1

    const ct = row.contract_type ?? 'indefinido'
    byContractType[ct] = (byContractType[ct] ?? 0) + 1
  }

  return {
    total_active: activeRows.length,
    by_department: byDepartment,
    by_contract_type: byContractType,
  }
}
