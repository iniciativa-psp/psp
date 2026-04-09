import { createClient } from '@/lib/supabase/server'
import type {
  VolunteerOpportunity,
  VolunteerRegistration,
  VolunteerSession,
  VolunteerStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Oportunidades de voluntariado
// ---------------------------------------------------------------------------

/** Devuelve oportunidades de voluntariado con filtros y paginación opcionales. */
export async function getVolunteerOpportunities(opts?: {
  status?: string
  sector?: string
  territorialId?: number
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<VolunteerOpportunity>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('volunteer_opportunities')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.sector) query = query.eq('sector', opts.sector)
  if (opts?.territorialId) query = query.eq('territorial_id', opts.territorialId)

  const { data, error, count } = await query
  if (error) throw new Error(`getVolunteerOpportunities: ${error.message}`)

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
// Postulaciones de voluntariado (alias moderno)
// ---------------------------------------------------------------------------

/** Devuelve postulaciones/inscripciones filtradas por actor u oportunidad (paginado). */
export async function getVolunteerApplications(opts?: {
  actorId?: string
  opportunityId?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<VolunteerRegistration>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('volunteer_registrations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.actorId) query = query.eq('actor_id', opts.actorId)
  if (opts?.opportunityId) query = query.eq('opportunity_id', opts.opportunityId)
  if (opts?.status) query = query.eq('status', opts.status)

  const { data, error, count } = await query
  if (error) throw new Error(`getVolunteerApplications: ${error.message}`)

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
// Inscripciones de voluntariado
// ---------------------------------------------------------------------------

/** Devuelve inscripciones filtradas por actor u oportunidad. */
export async function getVolunteerRegistrations(opts?: {
  actorId?: string
  opportunityId?: string
}): Promise<VolunteerRegistration[]> {
  const supabase = await createClient()
  let query = supabase
    .from('volunteer_registrations')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts?.actorId) query = query.eq('actor_id', opts.actorId)
  if (opts?.opportunityId) query = query.eq('opportunity_id', opts.opportunityId)

  const { data, error } = await query
  if (error) throw new Error(`getVolunteerRegistrations: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Jornadas de voluntariado
// ---------------------------------------------------------------------------

/** Registra horas de voluntariado en una sesión nueva. */
export async function logVolunteerHours(
  registrationId: string,
  hours: number,
  date: string,
  description?: string,
): Promise<VolunteerSession> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('volunteer_sessions')
    .insert({
      registration_id: registrationId,
      session_date: date,
      hours,
      activity_description: description,
    })
    .select()
    .single()

  if (error) throw new Error(`logVolunteerHours: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Certificados de voluntariado
// ---------------------------------------------------------------------------

/** Emite un certificado para una inscripción completada y devuelve el código. */
export async function issueVolunteerCertificate(
  registrationId: string,
): Promise<{ certificateCode: string }> {
  const supabase = await createClient()

  // Generar código único usando la función de base de datos
  const { data: codeData, error: codeError } = await supabase.rpc(
    'generate_certificate_code',
    { prefix: 'VOL' },
  )
  if (codeError) throw new Error(`issueVolunteerCertificate (code): ${codeError.message}`)

  const certificateCode = codeData as string

  const { error } = await supabase
    .from('volunteer_registrations')
    .update({
      certificate_code: certificateCode,
      certificate_issued_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', registrationId)

  if (error) throw new Error(`issueVolunteerCertificate (update): ${error.message}`)

  return { certificateCode }
}

// ---------------------------------------------------------------------------
// Estadísticas de voluntariado
// ---------------------------------------------------------------------------

/** Devuelve estadísticas generales del módulo de voluntariado. */
/** Vista v_volunteer_impact — columnas utilizadas en getVolunteerStats */
type VolunteerImpactRow = {
  actor_id: string
  actor_full_name: string
  actor_type: string
  total_sessions: number | null
  total_hours: number | null
  total_opportunities: number | null
  territorial_coverage: number | null
  territories: string | null
}

export async function getVolunteerStats(): Promise<VolunteerStats> {
  const supabase = await createClient()

  const [impactResult, oppResult, pendingResult] = await Promise.all([
    supabase.from('v_volunteer_impact').select('*'),
    supabase.from('volunteer_opportunities').select('id', { count: 'exact' }).eq('status', 'open').eq('is_active', true),
    supabase.from('volunteer_registrations').select('id', { count: 'exact' }).eq('status', 'pending'),
  ])

  if (impactResult.error) throw new Error(`getVolunteerStats: ${impactResult.error.message}`)

  const rows = (impactResult.data ?? []) as VolunteerImpactRow[]
  const bySector: Record<string, number> = {}

  const totalVolunteers = rows.length
  const totalHours = rows.reduce(
    (acc: number, r: VolunteerImpactRow) => acc + (r.total_hours ?? 0),
    0,
  )
  const totalSessions = rows.reduce(
    (acc: number, r: VolunteerImpactRow) => acc + (r.total_sessions ?? 0),
    0,
  )

  return {
    total_volunteers: totalVolunteers,
    total_hours: totalHours,
    total_sessions: totalSessions,
    active_opportunities: oppResult.count ?? 0,
    pending_applications: pendingResult.count ?? 0,
    by_sector: bySector,
  }
}
