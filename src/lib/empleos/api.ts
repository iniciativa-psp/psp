import { createClient } from '@/lib/supabase/server'
import type {
  JobPosition,
  JobApplication,
  JobPositionSummary,
  EmploymentRecord,
  EmploymentStatus,
  EmploymentType,
  EmploymentSector,
  EmploymentDashboardStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Posiciones laborales
// ---------------------------------------------------------------------------

/** Devuelve posiciones laborales (vista de resumen) con filtros y paginación. */
export async function getJobPositions(opts?: {
  status?: EmploymentStatus
  sector?: EmploymentSector
  employmentType?: EmploymentType
  territorialId?: number
  isYouthPriority?: boolean
  isFemalePriority?: boolean
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<JobPositionSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_job_positions_summary')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }
  if (opts?.sector) {
    query = query.eq('sector', opts.sector)
  }
  if (opts?.employmentType) {
    query = query.eq('employment_type', opts.employmentType)
  }
  if (opts?.territorialId) {
    query = query.eq('territorial_id', opts.territorialId)
  }
  if (opts?.isYouthPriority !== undefined) {
    query = query.eq('is_youth_priority', opts.isYouthPriority)
  }
  if (opts?.isFemalePriority !== undefined) {
    query = query.eq('is_female_priority', opts.isFemalePriority)
  }
  if (opts?.search) {
    query = query.ilike('title', `%${opts.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getJobPositions: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve una posición laboral por ID. */
export async function getJobPosition(id: string): Promise<JobPosition | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_positions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getJobPosition: ${error.message}`)
  }
  return data
}

/** Crea una nueva posición laboral. */
export async function createJobPosition(
  payload: Omit<JobPosition, 'id' | 'created_at' | 'updated_at'>,
): Promise<JobPosition> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_positions')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createJobPosition: ${error.message}`)
  return data
}

/** Actualiza una posición laboral existente. */
export async function updateJobPosition(
  id: string,
  payload: Partial<Omit<JobPosition, 'id' | 'created_at' | 'updated_at'>>,
): Promise<JobPosition> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_positions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateJobPosition: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Postulaciones
// ---------------------------------------------------------------------------

/** Devuelve las postulaciones para una posición laboral. */
export async function getJobApplications(
  jobPositionId: string,
): Promise<JobApplication[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_position_id', jobPositionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getJobApplications: ${error.message}`)
  return data ?? []
}

/** Crea una nueva postulación a una posición laboral. */
export async function createJobApplication(
  payload: Omit<JobApplication, 'id' | 'created_at' | 'updated_at'>,
): Promise<JobApplication> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_applications')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createJobApplication: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Registros de empleo
// ---------------------------------------------------------------------------

/** Devuelve registros de empleo con filtros y paginación. */
export async function getEmploymentRecords(opts?: {
  employeeActorId?: string
  employerActorId?: string
  sector?: EmploymentSector
  isActive?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<EmploymentRecord>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('employment_records')
    .select('*', { count: 'exact' })
    .order('start_date', { ascending: false })
    .range(from, to)

  if (opts?.employeeActorId) {
    query = query.eq('employee_actor_id', opts.employeeActorId)
  }
  if (opts?.employerActorId) {
    query = query.eq('employer_actor_id', opts.employerActorId)
  }
  if (opts?.sector) {
    query = query.eq('sector', opts.sector)
  }
  if (opts?.isActive !== undefined) {
    query = query.eq('is_active', opts.isActive)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getEmploymentRecords: ${error.message}`)

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
// Dashboard / estadísticas
// ---------------------------------------------------------------------------

/** Devuelve estadísticas del dashboard de empleos (vía RPC). */
export async function getEmploymentDashboardStats(): Promise<EmploymentDashboardStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_employment_dashboard_stats')

  if (error) throw new Error(`getEmploymentDashboardStats: ${error.message}`)
  return data as EmploymentDashboardStats
}
