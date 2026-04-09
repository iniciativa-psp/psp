'use client'

import { useState } from 'react'
import type { CourseEnrollment } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  enrolled: 'Inscrito',
  in_progress: 'En progreso',
  completed: 'Completado',
  withdrawn: 'Abandonado',
  failed: 'No aprobó',
}

const STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  withdrawn: 'bg-red-100 text-red-800',
  failed: 'bg-orange-100 text-orange-800',
}

interface EnrollmentRow extends CourseEnrollment {
  actor_name?: string
  course_name?: string
}

interface EnrollmentTableProps {
  enrollments: EnrollmentRow[]
}

export function EnrollmentTable({ enrollments }: EnrollmentTableProps) {
  const [sortField, setSortField] = useState<keyof EnrollmentRow>('enrolled_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...enrollments].sort((a, b) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(field: keyof EnrollmentRow) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: keyof EnrollmentRow }) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No hay inscripciones registradas.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th
              className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('actor_id')}
            >
              Alumno{SortIcon({ field: 'actor_id' })}
            </th>
            <th
              className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('course_id')}
            >
              Curso{SortIcon({ field: 'course_id' })}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progreso</th>
            <th
              className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('enrolled_at')}
            >
              Inscripción{SortIcon({ field: 'enrolled_at' })}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(enrollment => (
            <tr key={enrollment.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                    {(enrollment.actor_name ?? enrollment.actor_id).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {enrollment.actor_name ?? enrollment.actor_id.slice(0, 8)}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {enrollment.course_name ?? enrollment.course_id.slice(0, 8)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        enrollment.completion_pct >= 100
                          ? 'bg-emerald-500'
                          : enrollment.completion_pct > 0
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                      }`}
                      style={{ width: `${enrollment.completion_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10">
                    {enrollment.completion_pct}%
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground text-xs">
                {enrollment.enrolled_at
                  ? new Date(enrollment.enrolled_at).toLocaleDateString('es-PA')
                  : '—'}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[enrollment.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
