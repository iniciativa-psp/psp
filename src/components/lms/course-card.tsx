'use client'

import Link from 'next/link'
import { BookOpenIcon, ClockIcon, UsersIcon, GraduationCapIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Course } from '@/types'

const LEVEL_COLORS: Record<string, string> = {
  basico: 'bg-green-100 text-green-800',
  intermedio: 'bg-yellow-100 text-yellow-800',
  avanzado: 'bg-red-100 text-red-800',
}

const MODALITY_LABELS: Record<string, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
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

interface CourseCardProps {
  course: Course
  enrolledCount?: number
  completionRate?: number
  enrollmentProgress?: number | null
  isEnrolled?: boolean
}

export function CourseCard({
  course,
  enrolledCount = 0,
  completionRate = 0,
  enrollmentProgress = null,
  isEnrolled = false,
}: CourseCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="h-28 bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center relative">
        <GraduationCapIcon className="h-12 w-12 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
        <span
          className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            STATUS_COLORS[course.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {STATUS_LABELS[course.status] ?? course.status}
        </span>
        {course.category && (
          <span
            className={`absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              LEVEL_COLORS[course.category] ?? 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {course.category}
          </span>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Nombre */}
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{course.name}</h3>

        {/* Descripción */}
        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
        )}

        {/* Metadatos */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {course.duration_hours && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {course.duration_hours}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {enrolledCount} inscritos
          </span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            {MODALITY_LABELS[course.modality] ?? course.modality}
          </Badge>
        </div>

        {/* Barra de progreso del alumno inscrito */}
        {isEnrolled && enrollmentProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tu progreso</span>
              <span className="font-medium">{enrollmentProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${enrollmentProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tasa de completación */}
        {!isEnrolled && completionRate > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completación</span>
              <span className="font-medium">{completionRate.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="pt-1">
          <Link href={`/dashboard/lms/${course.id}`} className="w-full">
            <Button
              variant={isEnrolled ? 'default' : 'outline'}
              size="sm"
              className="w-full text-xs"
            >
              <BookOpenIcon className="h-3.5 w-3.5 mr-1" />
              {isEnrolled ? 'Continuar curso' : 'Ver curso'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
