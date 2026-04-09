import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCapIcon, PlusIcon, UsersIcon, CheckCircle2Icon, TrendingUpIcon } from 'lucide-react'
import { getCourses, getLMSStats } from '@/lib/lms/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CourseCard } from '@/components/lms/course-card'

export const metadata: Metadata = {
  title: 'Capacitaciones – SIG-PSP',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export default async function LmsPage() {
  const [coursesResult, stats] = await Promise.all([
    getCourses({ pageSize: 20 }),
    getLMSStats().catch(() => null),
  ])

  const courses = coursesResult.data

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCapIcon className="h-6 w-6 text-indigo-600" />
            Capacitaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de cursos, inscripciones y seguimiento de aprendizaje.
          </p>
        </div>
        <Link href="/dashboard/lms/new">
          <Button size="sm" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Nuevo curso
          </Button>
        </Link>
      </div>

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Capacitaciones</span>
      </nav>

      {/* KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores principales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-indigo-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <GraduationCapIcon className="h-4 w-4 text-indigo-500" />
                Cursos activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700">
                {stats?.total_courses ?? courses.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4 text-blue-500" />
                Total inscritos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats?.total_enrollments ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                Tasa de completación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {stats?.completion_rate ?? 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUpIcon className="h-4 w-4 text-violet-500" />
                Aprendices activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-700">
                {stats?.active_learners ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Catálogo de cursos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Catálogo de cursos</h2>
          <Badge variant="outline">{coursesResult.count} cursos</Badge>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
            <GraduationCapIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay cursos registrados aún.</p>
            <Link href="/dashboard/lms/new" className="mt-3 inline-block">
              <Button size="sm" variant="outline">Crear primer curso</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                enrolledCount={0}
                completionRate={0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lista de cursos — tabla rápida para gestores */}
      {courses.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Resumen de cursos</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Modalidad</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duración</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} className="border-t hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{course.code}</td>
                    <td className="py-3 px-4 font-medium">{course.name}</td>
                    <td className="py-3 px-4 text-muted-foreground capitalize">{course.modality}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {course.duration_hours ? `${course.duration_hours}h` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[course.status] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[course.status] ?? course.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/lms/${course.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
