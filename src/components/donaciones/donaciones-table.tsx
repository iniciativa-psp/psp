'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Donation } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
}

const TYPE_COLORS: Record<string, string> = {
  efectivo: 'bg-blue-100 text-blue-800 border-blue-200',
  especie: 'bg-purple-100 text-purple-800 border-purple-200',
  voluntariado: 'bg-pink-100 text-pink-800 border-pink-200',
  servicios: 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

const TYPE_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  especie: 'Especie',
  voluntariado: 'Voluntariado',
  servicios: 'Servicios',
}

const fmt = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })
const fmtDate = new Intl.DateTimeFormat('es-PA')

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  return fmt.format(amount).replace('US$', currency === 'PAB' ? 'B/.' : 'US$')
}

function formatDate(dateStr: string): string {
  try {
    return fmtDate.format(new Date(dateStr + 'T00:00:00'))
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DonacionesTableProps {
  donations: Donation[]
  total: number
  page: number
  pageSize: number
  onPageChange?: (page: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DonacionesTable({
  donations,
  total,
  page,
  pageSize,
  onPageChange,
}: DonacionesTableProps) {
  const [currentPage, setCurrentPage] = useState(page)
  const totalPages = Math.ceil(total / pageSize)

  function handlePage(p: number) {
    setCurrentPage(p)
    onPageChange?.(p)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donante</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Recurrente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay donaciones registradas.
                </TableCell>
              </TableRow>
            ) : (
              donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-sm">
                    {d.donor_actor_id ? (
                      <span className="text-blue-700 font-mono text-xs">{d.donor_actor_id.slice(0, 8)}…</span>
                    ) : (
                      <span className="text-muted-foreground italic">Anónimo</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">
                    {formatAmount(d.amount, d.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${TYPE_COLORS[d.donation_type] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {TYPE_LABELS[d.donation_type] ?? d.donation_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(d.donation_date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.is_recurring ? (
                      <span className="text-blue-600 font-medium">
                        {d.recurrence_period ?? 'Sí'}
                      </span>
                    ) : (
                      'No'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((currentPage - 1) * pageSize + 1, total)}–
            {Math.min(currentPage * pageSize, total)} de {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
