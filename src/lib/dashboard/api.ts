import { createClient } from '@/lib/supabase/server'
import { getActorStats } from '@/lib/actores/api'
import { getStrategyStats } from '@/lib/estrategia/api'
import { getEmploymentDashboardStats } from '@/lib/empleos/api'
import { getOpportunityStats } from '@/lib/oportunidades/api'
import { getMembershipMetrics } from '@/lib/membresias/api'
import { getLMSStats } from '@/lib/lms/api'
import { getVolunteerStats } from '@/lib/voluntariado/api'
import { getFundraisingStats } from '@/lib/donaciones/api'
import { getEconomicStats } from '@/lib/desarrollo-economico/api'
import { getMarketplaceStats } from '@/lib/marketplace/api'
import { getTerritorialStats } from '@/lib/territorial/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  // Territorial
  territorios_activos: number
  // Actores/CRM
  total_actores: number
  actores_nuevos_mes: number
  // Empleos
  vacantes_activas: number
  empleos_generados: number
  // Oportunidades
  oportunidades_activas: number
  // Pagos
  ingresos_mes: number
  ingresos_ano: number
  // Membresías
  suscripciones_activas: number
  // LMS
  cursos_activos: number
  inscritos_activos: number
  // Voluntariado
  voluntarios_registrados: number
  oportunidades_voluntariado: number
  // Donaciones
  total_donaciones_ano: number
  patrocinios_activos: number
  // Desarrollo Económico
  agentes_activos: number
  // Estrategia
  estrategia_proyectos_activos: number
  presupuesto_ejecutado_pct: number
  // Marketplace
  productos_activos: number
}

export type ActivityType =
  | 'actor_nuevo'
  | 'vacante_publicada'
  | 'inscripcion'
  | 'donacion'
  | 'membresía'
  | 'voluntario'
  | 'oportunidad'
  | 'producto'

export interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  date: string
  href?: string
}

export interface MetaItem {
  label: string
  meta: number
  actual: number
  unidad: string
  color: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function startOfYear(): string {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1).toISOString()
}

// ---------------------------------------------------------------------------
// getDashboardStats
// ---------------------------------------------------------------------------

/**
 * Agrega KPIs de todos los módulos usando Promise.allSettled para resiliencia.
 * Si un módulo falla, retorna 0 para sus valores.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const [
    territorialResult,
    actoresResult,
    actoresNuevosResult,
    empleosResult,
    oportunidadesResult,
    pagosResult,
    pagosMesResult,
    membresiasResult,
    lmsResult,
    voluntariadoResult,
    voluntariadoOpsResult,
    donacionesResult,
    economicoResult,
    estrategiaResult,
    marketplaceResult,
  ] = await Promise.allSettled([
    // Territorial
    getTerritorialStats(),

    // Actores totales
    getActorStats(),

    // Actores nuevos este mes
    supabase
      .from('actors')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', startOfMonth()),

    // Empleos
    getEmploymentDashboardStats(),

    // Oportunidades
    getOpportunityStats(),

    // Pagos año
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startOfYear()),

    // Pagos mes
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth()),

    // Membresías
    getMembershipMetrics(),

    // LMS
    getLMSStats(),

    // Voluntariado stats
    getVolunteerStats(),

    // Oportunidades voluntariado activas
    supabase
      .from('volunteer_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'open'),

    // Donaciones
    getFundraisingStats(),

    // Desarrollo económico
    getEconomicStats(),

    // Estrategia
    getStrategyStats(),

    // Marketplace
    getMarketplaceStats(),
  ])

  // --- Territorial ---
  const territorialStats =
    territorialResult.status === 'fulfilled' ? territorialResult.value : null
  const territorios_activos = territorialStats
    ? Object.values(territorialStats).reduce((a, b) => a + b, 0)
    : 0

  // --- Actores ---
  const actoresStats =
    actoresResult.status === 'fulfilled' ? actoresResult.value : null
  const total_actores = actoresStats?.['total'] ?? 0

  const actoresNuevosData =
    actoresNuevosResult.status === 'fulfilled' ? actoresNuevosResult.value : null
  const actores_nuevos_mes =
    actoresNuevosData && 'count' in actoresNuevosData
      ? (actoresNuevosData.count ?? 0)
      : 0

  // --- Empleos ---
  const empleosStats =
    empleosResult.status === 'fulfilled' ? empleosResult.value : null
  const vacantes_activas = empleosStats?.positions_open ?? 0
  const empleos_generados = empleosStats?.total_employment_records ?? 0

  // --- Oportunidades ---
  const opStats =
    oportunidadesResult.status === 'fulfilled' ? oportunidadesResult.value : null
  const oportunidades_activas =
    opStats?.by_status?.find((s) => s.status === 'active')?.count ??
    opStats?.total ??
    0

  // --- Pagos ---
  type PaymentRow = { amount: number | null }

  const pagosAnoData =
    pagosResult.status === 'fulfilled' ? pagosResult.value : null
  const ingresos_ano =
    pagosAnoData && 'data' in pagosAnoData
      ? ((pagosAnoData.data ?? []) as PaymentRow[]).reduce(
          (acc, p) => acc + (p.amount ?? 0),
          0,
        )
      : 0

  const pagosMesData =
    pagosMesResult.status === 'fulfilled' ? pagosMesResult.value : null
  const ingresos_mes =
    pagosMesData && 'data' in pagosMesData
      ? ((pagosMesData.data ?? []) as PaymentRow[]).reduce(
          (acc, p) => acc + (p.amount ?? 0),
          0,
        )
      : 0

  // --- Membresías ---
  const membresiasMetrics =
    membresiasResult.status === 'fulfilled' ? membresiasResult.value : null
  const suscripciones_activas = membresiasMetrics?.activas ?? 0

  // --- LMS ---
  const lmsStats = lmsResult.status === 'fulfilled' ? lmsResult.value : null
  const cursos_activos = lmsStats?.total_courses ?? 0
  const inscritos_activos = lmsStats?.total_enrollments ?? 0

  // --- Voluntariado ---
  const voluntariadoStats =
    voluntariadoResult.status === 'fulfilled' ? voluntariadoResult.value : null
  const voluntarios_registrados = voluntariadoStats?.total_volunteers ?? 0

  const voluntariadoOpsData =
    voluntariadoOpsResult.status === 'fulfilled' ? voluntariadoOpsResult.value : null
  const oportunidades_voluntariado =
    voluntariadoOpsData && 'count' in voluntariadoOpsData
      ? (voluntariadoOpsData.count ?? 0)
      : 0

  // --- Donaciones ---
  const donacionesStats =
    donacionesResult.status === 'fulfilled' ? donacionesResult.value : null
  const total_donaciones_ano = donacionesStats?.total_donations ?? 0
  const patrocinios_activos = donacionesStats?.total_sponsorships ?? 0

  // --- Desarrollo Económico ---
  const economicoStats =
    economicoResult.status === 'fulfilled' ? economicoResult.value : null
  const agentes_activos = economicoStats?.total_economic_actors ?? 0

  // --- Estrategia ---
  const estrategiaStats =
    estrategiaResult.status === 'fulfilled' ? estrategiaResult.value : null
  const estrategia_proyectos_activos = estrategiaStats?.['status_in_progress'] ?? 0
  const estrategia_total = estrategiaStats?.['total'] ?? 0
  const presupuesto_ejecutado_pct =
    estrategia_total > 0
      ? Math.round(
          ((estrategiaStats?.['status_completed'] ?? 0) / estrategia_total) * 100,
        )
      : 0

  // --- Marketplace ---
  const marketplaceStats =
    marketplaceResult.status === 'fulfilled' ? marketplaceResult.value : null
  const productos_activos = marketplaceStats?.active_products ?? 0

  return {
    territorios_activos,
    total_actores,
    actores_nuevos_mes,
    vacantes_activas,
    empleos_generados,
    oportunidades_activas,
    ingresos_mes,
    ingresos_ano,
    suscripciones_activas,
    cursos_activos,
    inscritos_activos,
    voluntarios_registrados,
    oportunidades_voluntariado,
    total_donaciones_ano,
    patrocinios_activos,
    agentes_activos,
    estrategia_proyectos_activos,
    presupuesto_ejecutado_pct,
    productos_activos,
  }
}

// ---------------------------------------------------------------------------
// getRecentActivity
// ---------------------------------------------------------------------------

/**
 * Combina las últimas acciones de actores, vacantes e inscripciones, ordenadas por fecha.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const [actoresRes, vacantesRes, inscripcionesRes, donacionesRes] =
    await Promise.allSettled([
      supabase
        .from('actors')
        .select('id, full_name, legal_name, actor_type, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),

      supabase
        .from('job_positions')
        .select('id, title, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit),

      supabase
        .from('course_enrollments')
        .select('id, course_id, enrolled_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),

      supabase
        .from('donations')
        .select('id, amount, donation_type, donation_date, created_at')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

  const items: ActivityItem[] = []

  if (actoresRes.status === 'fulfilled' && actoresRes.value.data) {
    for (const a of actoresRes.value.data) {
      items.push({
        id: `actor-${a.id}`,
        type: 'actor_nuevo',
        description: `Nuevo actor registrado: ${a.full_name ?? a.legal_name ?? 'Sin nombre'}`,
        date: a.created_at,
        href: `/dashboard/actores/${a.id}`,
      })
    }
  }

  if (vacantesRes.status === 'fulfilled' && vacantesRes.value.data) {
    for (const v of vacantesRes.value.data) {
      items.push({
        id: `vacante-${v.id}`,
        type: 'vacante_publicada',
        description: `Vacante publicada: ${v.title}`,
        date: v.created_at,
        href: `/dashboard/empleos/${v.id}`,
      })
    }
  }

  if (inscripcionesRes.status === 'fulfilled' && inscripcionesRes.value.data) {
    for (const i of inscripcionesRes.value.data) {
      items.push({
        id: `inscripcion-${i.id}`,
        type: 'inscripcion',
        description: `Nueva inscripción a curso`,
        date: i.enrolled_at ?? i.created_at,
        href: `/dashboard/lms`,
      })
    }
  }

  if (donacionesRes.status === 'fulfilled' && donacionesRes.value.data) {
    for (const d of donacionesRes.value.data) {
      const fmt = new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
      })
      items.push({
        id: `donacion-${d.id}`,
        type: 'donacion',
        description: `Donación recibida: ${fmt.format(d.amount ?? 0)}`,
        date: d.created_at ?? d.donation_date,
        href: `/dashboard/donaciones`,
      })
    }
  }

  // Sort by date descending and take top `limit`
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return items.slice(0, limit)
}

// ---------------------------------------------------------------------------
// getMetas2025
// ---------------------------------------------------------------------------

/**
 * Metas del programa 2025–2035 con valores actuales obtenidos de Supabase.
 */
export async function getMetas2025(
  stats: DashboardStats,
): Promise<MetaItem[]> {
  return [
    {
      label: 'Familias beneficiadas',
      meta: 50000,
      actual: stats.total_actores,
      unidad: 'familias',
      color: 'bg-blue-500',
    },
    {
      label: 'Empleos formales',
      meta: 10000,
      actual: stats.empleos_generados,
      unidad: 'empleos',
      color: 'bg-emerald-500',
    },
    {
      label: 'Voluntarios activos',
      meta: 5000,
      actual: stats.voluntarios_registrados,
      unidad: 'voluntarios',
      color: 'bg-pink-500',
    },
    {
      label: 'MiPYMES formalizadas',
      meta: 2000,
      actual: stats.agentes_activos,
      unidad: 'empresas',
      color: 'bg-amber-500',
    },
  ]
}
