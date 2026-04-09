'use client'

import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { VolunteerOpportunity } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  filled: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  filled: 'Completa',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

interface OpportunityCardProps {
  opportunity: VolunteerOpportunity
  onApply?: (id: string) => void
  onViewApplications?: (id: string) => void
}

export function OpportunityCard({
  opportunity,
  onApply,
  onViewApplications,
}: OpportunityCardProps) {
  const totalSlots = opportunity.slots_available
  const filledSlots = opportunity.slots_filled
  const fillPct = totalSlots > 0 ? Math.min(Math.round((filledSlots / totalSlots) * 100), 100) : 0
  const isFull = filledSlots >= totalSlots

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
            {opportunity.title}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              STATUS_COLORS[opportunity.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {STATUS_LABELS[opportunity.status] ?? opportunity.status}
          </span>
        </div>

        {/* Sector */}
        {opportunity.sector && (
          <Badge variant="outline" className="text-xs w-fit">
            {opportunity.sector}
          </Badge>
        )}

        {/* Descripción */}
        {opportunity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{opportunity.description}</p>
        )}

        {/* Metadatos */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {opportunity.hours_per_week && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {opportunity.hours_per_week}h/semana
            </span>
          )}
          {opportunity.is_remote && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" />
              Remoto
            </span>
          )}
          {opportunity.start_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {new Date(opportunity.start_date).toLocaleDateString('es-PA')}
            </span>
          )}
        </div>

        {/* Cupos disponibles — barra de progreso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              Cupos
            </span>
            <span className="font-medium">
              {filledSlots} / {totalSlots}
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-red-500' : fillPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isFull ? 'Sin cupos disponibles' : `${totalSlots - filledSlots} cupo(s) disponible(s)`}
          </p>
        </div>

        {/* Requisitos */}
        {opportunity.skills_required && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Requisitos:</span> {opportunity.skills_required}
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          {onApply && (
            <Button
              size="sm"
              className="flex-1 text-xs"
              disabled={isFull || opportunity.status !== 'open'}
              onClick={() => onApply(opportunity.id)}
            >
              Postularse
            </Button>
          )}
          {onViewApplications && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onViewApplications(opportunity.id)}
            >
              Ver postulaciones
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
