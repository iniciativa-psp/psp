import { createClient } from '@/lib/supabase/server'
import type {
  Course,
  CourseEnrollment,
  LMSStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

/** Devuelve cursos con filtros y paginación opcionales. */
export async function getCourses(opts?: {
  status?: string
  modality?: string
  category?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<Course>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('courses')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.modality) query = query.eq('modality', opts.modality)
  if (opts?.category) query = query.eq('category', opts.category)

  const { data, error, count } = await query
  if (error) throw new Error(`getCourses: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un curso por ID. */
export async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getCourse: ${error.message}`)
  }
  return data
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

/** Inscribe un actor en un curso. */
export async function enrollInCourse(
  courseId: string,
  actorId: string,
): Promise<CourseEnrollment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({ course_id: courseId, actor_id: actorId })
    .select()
    .single()

  if (error) throw new Error(`enrollInCourse: ${error.message}`)
  return data
}

/** Actualiza el progreso de una inscripción (porcentaje completado y nota). */
export async function updateEnrollmentProgress(
  enrollmentId: string,
  pct: number,
  score?: number,
): Promise<CourseEnrollment> {
  const supabase = await createClient()
  const updates: Partial<CourseEnrollment> = { completion_pct: pct }

  if (score !== undefined) {
    updates.final_score = score
  }

  if (pct >= 100) {
    updates.status = 'completed'
    updates.completed_at = new Date().toISOString()
  } else if (pct > 0) {
    updates.status = 'in_progress'
  }

  const { data, error } = await supabase
    .from('course_enrollments')
    .update(updates)
    .eq('id', enrollmentId)
    .select()
    .single()

  if (error) throw new Error(`updateEnrollmentProgress: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Certificados
// ---------------------------------------------------------------------------

/** Emite un certificado de curso y devuelve el código y URL. */
export async function issueCertificate(
  enrollmentId: string,
): Promise<{ certificateCode: string; url: string }> {
  const supabase = await createClient()

  // Generar código único usando la función de base de datos
  const { data: codeData, error: codeError } = await supabase.rpc(
    'generate_certificate_code',
    { prefix: 'CURSO' },
  )
  if (codeError) throw new Error(`issueCertificate (code): ${codeError.message}`)

  const certificateCode = codeData as string
  const url = `/certificados/${certificateCode}`

  const { error } = await supabase
    .from('course_enrollments')
    .update({
      certificate_code: certificateCode,
      certificate_issued_at: new Date().toISOString(),
      certificate_url: url,
      passed: true,
    })
    .eq('id', enrollmentId)

  if (error) throw new Error(`issueCertificate (update): ${error.message}`)

  return { certificateCode, url }
}

// ---------------------------------------------------------------------------
// Consultas de inscripciones
// ---------------------------------------------------------------------------

/** Devuelve inscripciones de un curso con paginación opcional. */
export async function getCourseEnrollments(
  courseId: string,
  opts?: { page?: number; pageSize?: number },
): Promise<PaginatedResponse<CourseEnrollment>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('course_enrollments')
    .select('*', { count: 'exact' })
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`getCourseEnrollments: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve los cursos en que un actor está inscrito junto con su progreso. */
export async function getMyEnrollments(actorId: string): Promise<CourseEnrollment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('actor_id', actorId)
    .order('enrolled_at', { ascending: false })

  if (error) throw new Error(`getMyEnrollments: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Estadísticas del LMS
// ---------------------------------------------------------------------------

/** Devuelve estadísticas globales del módulo LMS. */
/** Vista v_course_stats — columnas utilizadas en getLMSStats */
type CourseStatsRow = {
  course_id: string
  code: string
  name: string
  modality: string
  course_status: string
  total_enrolled: number | null
  in_progress: number | null
  completed: number | null
  failed: number | null
  withdrawn: number | null
  avg_score: number | null
  completion_rate: number | null
}

export async function getLMSStats(): Promise<LMSStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_course_stats')
    .select('*')

  if (error) throw new Error(`getLMSStats: ${error.message}`)

  const rows = (data ?? []) as CourseStatsRow[]
  const totalCourses = rows.length
  const totalEnrollments = rows.reduce(
    (acc: number, r: CourseStatsRow) => acc + (r.total_enrolled ?? 0),
    0,
  )
  const totalCompleted = rows.reduce(
    (acc: number, r: CourseStatsRow) => acc + (r.completed ?? 0),
    0,
  )
  const completionRate =
    totalEnrollments > 0
      ? Math.round((totalCompleted / totalEnrollments) * 100 * 100) / 100
      : 0
  const scores = rows
    .map((r: CourseStatsRow) => r.avg_score)
    .filter((s) => s !== null && s !== undefined) as number[]
  const avgScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0

  return {
    total_courses: totalCourses,
    total_enrollments: totalEnrollments,
    completion_rate: completionRate,
    avg_score: avgScore,
    active_learners: rows.reduce(
      (acc: number, r: CourseStatsRow) => acc + (r.in_progress ?? 0),
      0,
    ),
  }
}
