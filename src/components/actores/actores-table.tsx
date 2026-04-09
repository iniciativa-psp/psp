'use client'

import Link from 'next/link'
import { EyeIcon, PencilIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ACTOR_TYPE_LABELS, ACTOR_STATUS_LABELS } from '@/types'
import type { ActorSummary, ActorType, ActorStatus } from '@/types'
import type { Actor } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<ActorType, string> = {
  persona_natural: 'bg-blue-100 text-blue-800 border-blue-200',
  hogar: 'bg-green-100 text-green-800 border-green-200',
  empresa: 'bg-purple-100 text-purple-800 border-purple-200',
  cooperativa: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ong: 'bg-pink-100 text-pink-800 border-pink-200',
  institucion_publica: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  agrupacion: 'bg-orange-100 text-orange-800 border-orange-200',
  organismo_internacional: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  medio_comunicacion: 'bg-rose-100 text-rose-800 border-rose-200',
}

const AVATAR_BG: Record<ActorType, string> = {
  persona_natural: 'bg-blue-500',
  hogar: 'bg-green-500',
  empresa: 'bg-purple-500',
  cooperativa: 'bg-yellow-500',
  ong: 'bg-pink-500',
  institucion_publica: 'bg-indigo-500',
  agrupacion: 'bg-orange-500',
  organismo_internacional: 'bg-cyan-500',
  medio_comunicacion: 'bg-rose-500',
}

const STATUS_COLORS: Record<ActorStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending_verification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function buildWhatsAppLink(whatsapp: string | null): string | null {
  if (!whatsapp) return null
  const digits = whatsapp.replace(/\D/g, '')
  if (whatsapp.startsWith('+507') || digits.length === 8) {
    return `https://wa.me/507${digits.slice(-8)}`
  }
  if (whatsapp.startsWith('+') && digits.length > 8) {
    return `https://wa.me/${digits}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActoresTableProps {
  actors: ActorSummary[]
  onEdit?: (actor: ActorSummary) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActoresTable({ actors, onEdit }: ActoresTableProps) {
  if (actors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-lg font-medium text-foreground">No se encontraron actores</p>
        <p className="text-sm text-muted-foreground mt-1">
          Intenta ajustar los filtros o registra un nuevo actor.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12"></th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Territorio</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Contacto</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {actors.map(actor => {
            const waLink = buildWhatsAppLink(actor.whatsapp)
            return (
              <tr key={actor.id} className="hover:bg-muted/30 transition-colors">
                {/* Avatar */}
                <td className="px-4 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`${AVATAR_BG[actor.actor_type]} text-white text-xs font-semibold`}>
                      {getInitials(actor.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </td>

                {/* Nombre */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{actor.full_name}</div>
                  {actor.legal_name && (
                    <div className="text-xs text-muted-foreground">{actor.legal_name}</div>
                  )}
                </td>

                {/* Tipo */}
                <td className="px-4 py-3">
                  <Badge className={`text-xs border ${TYPE_COLORS[actor.actor_type]}`} variant="outline">
                    {ACTOR_TYPE_LABELS[actor.actor_type]}
                  </Badge>
                </td>

                {/* Territorio */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-muted-foreground text-xs">
                    {actor.territorial_name ?? '—'}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <Badge className={`text-xs border ${STATUS_COLORS[actor.status]}`} variant="outline">
                    {ACTOR_STATUS_LABELS[actor.status]}
                  </Badge>
                </td>

                {/* Contacto */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-col gap-0.5">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline text-xs"
                      >
                        WhatsApp
                      </a>
                    )}
                    {actor.email && (
                      <a
                        href={`mailto:${actor.email}`}
                        className="text-blue-600 hover:underline text-xs truncate max-w-[160px]"
                      >
                        {actor.email}
                      </a>
                    )}
                    {!waLink && !actor.email && (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                      <Link href={`/dashboard/actores/${actor.id}`} aria-label={`Ver ${actor.full_name}`}>
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(actor)}
                        aria-label={`Editar ${actor.full_name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
