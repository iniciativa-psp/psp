'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { updateApplicationStatusAction } from '@/lib/voluntariado/actions'
import type { VolunteerRegistration } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  completed: 'Completado',
  withdrawn: 'Retirado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  withdrawn: 'bg-gray-100 text-gray-700',
}

interface ApplicationRow extends VolunteerRegistration {
  actor_name?: string
  opportunity_title?: string
}

interface ApplicationTableProps {
  applications: ApplicationRow[]
}

export function ApplicationTable({ applications }: ApplicationTableProps) {
  const [sortField, setSortField] = useState<keyof ApplicationRow>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [updating, setUpdating] = useState<string | null>(null)
  const [localApps, setLocalApps] = useState<ApplicationRow[]>(applications)

  const sorted = [...localApps].sort((a, b) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(field: keyof ApplicationRow) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: keyof ApplicationRow }) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdating(id)
    const result = await updateApplicationStatusAction(id, newStatus)
    if (result.success) {
      setLocalApps(prev =>
        prev.map(app => (app.id === id ? { ...app, status: newStatus } : app)),
      )
    }
    setUpdating(null)
  }

  if (localApps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No hay postulaciones registradas.</p>
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
              Voluntario{SortIcon({ field: 'actor_id' })}
            </th>
            <th
              className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('opportunity_id')}
            >
              Oportunidad{SortIcon({ field: 'opportunity_id' })}
            </th>
            <th
              className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('created_at')}
            >
              Fecha{SortIcon({ field: 'created_at' })}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(app => (
            <tr key={app.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-semibold text-xs">
                    {(app.actor_name ?? app.actor_id).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {app.actor_name ?? app.actor_id.slice(0, 8)}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {app.opportunity_title ?? app.opportunity_id.slice(0, 8)}
              </td>
              <td className="py-3 px-4 text-muted-foreground text-xs">
                {new Date(app.created_at).toLocaleDateString('es-PA')}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {app.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                      disabled={updating === app.id}
                      onClick={() => handleStatusChange(app.id, 'accepted')}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                      disabled={updating === app.id}
                      onClick={() => handleStatusChange(app.id, 'rejected')}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
                {app.status === 'accepted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                    disabled={updating === app.id}
                    onClick={() => handleStatusChange(app.id, 'completed')}
                  >
                    Completar
                  </Button>
                )}
                {(app.status === 'completed' || app.status === 'rejected' || app.status === 'withdrawn') && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
