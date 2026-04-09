import type { Metadata } from 'next'
<<<<<<< copilot/improve-main-dashboard-kpis
import {
  MapIcon,
  CreditCardIcon,
  Users2Icon,
  TargetIcon,
  BriefcaseIcon,
  LightbulbIcon,
  ShoppingBagIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  HandshakeIcon,
  CalendarDaysIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  LayersIcon,
} from 'lucide-react'
=======
import Link from 'next/link'
<<<<<<< copilot/add-desarrollo-economico-ui
import { MapIcon, CreditCardIcon, CheckCircle2Icon, Users2Icon, TargetIcon, BriefcaseIcon, LightbulbIcon, ShoppingBagIcon, TrendingUpIcon } from 'lucide-react'
=======
import { MapIcon, CreditCardIcon, CheckCircle2Icon, Users2Icon, TargetIcon, BriefcaseIcon, LightbulbIcon, ShoppingBagIcon, GraduationCapIcon, HeartHandshakeIcon } from 'lucide-react'
>>>>>>> main
>>>>>>> main
import { getProfile } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/types'
import { getDashboardStats, getRecentActivity, getMetas2025 } from '@/lib/dashboard/api'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { ProgressGoal } from '@/components/dashboard/progress-goal'
import { ModuleCard } from '@/components/dashboard/module-card'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export const metadata: Metadata = {
  title: 'Dashboard – SIG-PSP',
}

export default async function DashboardPage() {
  const [profile, stats, activity] = await Promise.all([
    getProfile(),
    getDashboardStats(),
    getRecentActivity(8),
  ])
  const metas = await getMetas2025(stats)

  const now = new Date()
  const fecha = now.toLocaleDateString('es-PA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const modules = [
    {
      title: 'Territorial',
      description:
        'División Político-Administrativa de Panamá: provincias, distritos, corregimientos y comunidades.',
      href: '/dashboard/territorial',
      icon: MapIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      stat: stats.territorios_activos,
      statLabel: 'territorios',
    },
    {
      title: 'Actores / CRM',
      description:
        'Registro de personas, hogares, empresas, cooperativas, ONGs e instituciones vinculadas al programa.',
      href: '/dashboard/actores',
      icon: Users2Icon,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      stat: stats.total_actores,
      statLabel: 'actores',
    },
    {
      title: 'Estrategia',
      description:
        'Planificación estratégica: planes, programas, proyectos y actividades con presupuesto y KPIs.',
      href: '/dashboard/estrategia',
      icon: TargetIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      stat: stats.estrategia_proyectos_activos,
      statLabel: 'proyectos activos',
    },
    {
      title: 'Empleos',
      description:
        'Pilar central de la estrategia: gestión de vacantes, postulaciones y registros de empleo.',
      href: '/dashboard/empleos',
      icon: BriefcaseIcon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      stat: stats.vacantes_activas,
      statLabel: 'vacantes',
    },
    {
      title: 'Oportunidades',
      description:
        'Oportunidades de desarrollo económico: capacitación, financiamiento, mercados y alianzas.',
      href: '/dashboard/oportunidades',
      icon: LightbulbIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      stat: stats.oportunidades_activas,
      statLabel: 'activas',
    },
    {
      title: 'Membresías',
      description:
        'Gestión de planes de membresía, suscripciones activas y facturación recurrente.',
      href: '/dashboard/membresias',
      icon: HandshakeIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      stat: stats.suscripciones_activas,
      statLabel: 'activas',
    },
    {
      title: 'Capacitaciones',
      description:
        'Catálogo de cursos, inscripciones, progreso y certificados del sistema LMS.',
      href: '/dashboard/lms',
      icon: GraduationCapIcon,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      stat: stats.cursos_activos,
      statLabel: 'cursos',
    },
    {
      title: 'Voluntariado',
      description:
        'Registro y gestión de voluntarios, oportunidades y sesiones de servicio.',
      href: '/dashboard/voluntariado',
      icon: CalendarDaysIcon,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      stat: stats.voluntarios_registrados,
      statLabel: 'voluntarios',
    },
    {
      title: 'Donaciones',
      description:
        'Seguimiento de donaciones, patrocinadores, campañas y certificados de donante.',
      href: '/dashboard/donaciones',
      icon: HeartHandshakeIcon,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      stat: stats.patrocinios_activos,
      statLabel: 'patrocinios',
    },
    {
      title: 'Desarrollo Económico',
      description:
        'Sectores productivos, agentes económicos, servicios estratégicos y formalización.',
      href: '/dashboard/desarrollo-economico',
      icon: TrendingUpIcon,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      stat: stats.agentes_activos,
      statLabel: 'agentes',
    },
    {
      title: 'Marketplace',
      description:
        'Catálogo de productos y servicios de productores, artesanos y emprendedores PSP.',
      href: '/dashboard/marketplace',
      icon: ShoppingBagIcon,
      color: 'text-red-600',
      bg: 'bg-red-50',
      stat: stats.productos_activos,
      statLabel: 'productos',
    },
    {
<<<<<<< copilot/add-desarrollo-economico-ui
      title: 'Desarrollo Económico',
      description: 'Sectores productivos, agentes económicos, formalización y perfiles empresariales.',
      href: '/dashboard/desarrollo-economico',
      icon: TrendingUpIcon,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
=======
      title: 'Membresías',
      description: 'Gestión de planes, suscripciones y beneficios para miembros.',
      href: '/dashboard/membresias',
      icon: CreditCardIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
>>>>>>> main
    },
    {
      title: 'Pagos',
      description:
        'Gestión de beneficiarios, conceptos de pago y registro de transacciones del programa.',
      href: '/dashboard/pagos',
      icon: CreditCardIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize">{fecha}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role && (
            <Badge variant="secondary" className="text-sm">
              {ROLE_LABELS[profile.role]}
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Actores registrados"
          value={stats.total_actores}
          change={stats.actores_nuevos_mes}
          changeLabel="nuevos este mes"
          icon={UsersIcon}
          color="bg-violet-500"
          href="/dashboard/actores"
        />
        <KpiCard
          title="Vacantes activas"
          value={stats.vacantes_activas}
          change={stats.empleos_generados}
          changeLabel="empleos generados"
          icon={BriefcaseIcon}
          color="bg-emerald-500"
          href="/dashboard/empleos"
        />
        <KpiCard
          title="Ingresos este mes"
          value={stats.ingresos_mes}
          formatCurrency
          icon={DollarSignIcon}
          color="bg-green-500"
          href="/dashboard/pagos"
        />
        <KpiCard
          title="Proyectos en progreso"
          value={stats.estrategia_proyectos_activos}
          changeLabel={`${stats.presupuesto_ejecutado_pct}% completado`}
          icon={LayersIcon}
          color="bg-indigo-500"
          href="/dashboard/estrategia"
        />
      </div>

      {/* Metas 2025–2035 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            Metas 2025–2035 — Iniciativa Panamá Sin Pobreza
          </CardTitle>
        </CardHeader>
        <CardContent>
<<<<<<< copilot/improve-main-dashboard-kpis
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {metas.map((meta) => (
              <ProgressGoal
                key={meta.label}
                label={meta.label}
                actual={meta.actual}
                meta={meta.meta}
                unidad={meta.unidad}
                color={meta.color}
              />
=======
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Autenticación', status: 'Activo' },
              { label: 'RBAC', status: 'Activo' },
              { label: 'Territorial', status: 'Activo' },
              { label: 'Actores', status: 'Activo' },
              { label: 'Estrategia', status: 'Activo' },
              { label: 'Empleos', status: 'Activo' },
              { label: 'Oportunidades', status: 'Activo' },
              { label: 'Marketplace', status: 'Activo' },
              { label: 'Membresías', status: 'Activo' },
              { label: 'Pagos', status: 'Activo' },
              { label: 'Desarrollo Económico', status: 'Activo' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-xs text-green-700 font-medium">{item.label}</div>
                <div className="text-xs text-green-600 mt-0.5">{item.status}</div>
              </div>
>>>>>>> main
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Módulos + Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulos */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Módulos del sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.href}
                title={mod.title}
                href={mod.href}
                icon={mod.icon}
                color={mod.color}
                bg={mod.bg}
                description={mod.description}
                stat={mod.stat}
                statLabel={mod.statLabel}
              />
            ))}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Actividad reciente
          </h2>
          <Card>
            <CardContent className="pt-4">
              <RecentActivity items={activity} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
