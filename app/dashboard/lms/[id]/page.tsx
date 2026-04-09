import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GraduationCapIcon, ArrowLeftIcon, CalendarIcon, ClockIcon, UsersIcon } from 'lucide-react'
import { getCourse, getCourseEnrollments } from '@/lib/lms/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnrollmentTable } from '@/components/lms/enrollment-table'

export const metadata: Metadata = {
  title: 'Detalle de Curso – SIG-PSP',
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

const MODALITY_LABELS: Record<string, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
}

interface CourseDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params

  const [course, enrollmentsResult] = await Promise.all([
    getCourse(id),
    getCourseEnrollments(id, { pageSize: 50 }).catch(() => null),
  ])

  if (!course) notFound()

  const enrollments = enrollmentsResult?.data ?? []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/lms" className="hover:text-foreground">Capacitaciones</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{course.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/lms">
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                <ArrowLeftIcon className="h-4 w-4" />
                Volver
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCapIcon className="h-6 w-6 text-indigo-600" />
            {course.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {course.code}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLORS[course.status] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {STATUS_LABELS[course.status] ?? course.status}
            </span>
            {course.category && (
              <Badge variant="outline" className="text-xs">{course.category}</Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {MODALITY_LABELS[course.modality] ?? course.modality}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <UsersIcon className="h-4 w-4" />
            Agregar inscripción
          </Button>
          <Button size="sm" className="gap-1">
            Editar curso
          </Button>
        </div>
      </div>

      {/* Información del curso */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Descripción y datos principales */}
        <div className="lg:col-span-2 space-y-4">
          {course.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ficha técnica */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ficha técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {course.duration_hours && (
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium">{course.duration_hours} horas</span>
              </div>
            )}

            {course.max_participants && (
              <div className="flex items-center gap-2 text-sm">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Máx. participantes:</span>
                <span className="font-medium">{course.max_participants}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Inscritos:</span>
              <span className="font-medium">{enrollments.length}</span>
            </div>

            {course.start_date && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inicio:</span>
                <span className="font-medium">
                  {new Date(course.start_date).toLocaleDateString('es-PA')}
                </span>
              </div>
            )}

            {course.end_date && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fin:</span>
                <span className="font-medium">
                  {new Date(course.end_date).toLocaleDateString('es-PA')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Nota aprobación:</span>
              <span className="font-medium">{course.passing_score}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de inscritos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Inscripciones</h2>
          <Badge variant="outline">{enrollments.length} inscripciones</Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            <EnrollmentTable enrollments={enrollments} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
