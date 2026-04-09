'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MEMBERSHIP_STATUS_LABELS } from '@/types'
import type { MembershipSummary, MembershipStatus } from '@/types'

// ---------------------------------------------------------------------------
// Badge colours
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  past_due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspended: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PLAN_COLORS: Record<string, string> = {
  hogar_solidario: 'bg-blue-100 text-blue-800 border-blue-200',
  agricultor: 'bg-green-100 text-green-800 border-green-200',
  artesano: 'bg-orange-100 text-orange-800 border-orange-200',
  comercio_mercadito: 'bg-purple-100 text-purple-800 border-purple-200',
  empresa_solidaria: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ong_cooperativa: 'bg-teal-100 text-teal-800 border-teal-200',
  socio_estrategico_per: 'bg-rose-100 text-rose-800 border-rose-200',
  socio_estrategico_emp: 'bg-red-100 text-red-800 border-red-200',
  inversor_social_per: 'bg-amber-100 text-amber-800 border-amber-200',
  inversor_social_com: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount)
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MembresiasTableProps {
  memberships: MembershipSummary[]
}

export function MembresiasTable({ memberships }: MembresiasTableProps) {
  if (memberships.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay membresías que coincidan con los filtros seleccionados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left font-semibold px-4 py-3">Miembro</th>
            <th className="text-left font-semibold px-4 py-3">Plan</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="text-left font-semibold px-4 py-3">Fecha inicio</th>
            <th className="text-left font-semibold px-4 py-3">Vencimiento</th>
            <th className="text-right font-semibold px-4 py-3">Monto</th>
            <th className="text-right font-semibold px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {memberships.map((m, idx) => (
            <tr
              key={m.id}
              className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
            >
              {/* Miembro (avatar + nombre) */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials(m.actor_full_name ?? '?')}
                  </div>
                  <Link
                    href={`/dashboard/membresias/${m.id}`}
                    className="font-medium hover:underline text-foreground"
                  >
                    {m.actor_full_name}
                  </Link>
                </div>
              </td>

              {/* Plan */}
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${PLAN_COLORS[m.plan_code] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {m.plan_name}
                </Badge>
              </td>

              {/* Estado */}
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {MEMBERSHIP_STATUS_LABELS[m.status] ?? m.status}
                </Badge>
              </td>

              {/* Fecha inicio */}
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(m.start_at)}
              </td>

              {/* Vencimiento */}
              <td className="px-4 py-3 text-muted-foreground">
                {m.end_at ? (
                  <span className={m.is_expiring_soon ? 'text-amber-600 font-medium' : ''}>
                    {formatDate(m.end_at)}
                    {m.is_expiring_soon && (
                      <span className="ml-1 text-xs text-amber-500">⚠ vence pronto</span>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </td>

              {/* Monto */}
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(m.amount_paid ?? m.price_monthly)}
              </td>

              {/* Acciones */}
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/membresias/${m.id}`}
                  className="text-primary hover:underline text-xs"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
