'use client'

import { useState } from 'react'
import { StarIcon } from 'lucide-react'
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
import type { Sponsorship } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<string, string> = {
  bronce: 'bg-orange-100 text-orange-800 border-orange-200',
  plata: 'bg-gray-100 text-gray-700 border-gray-300',
  oro: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  platino: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  diamante: 'bg-blue-100 text-blue-800 border-blue-200',
}

const LEVEL_LABELS: Record<string, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
  diamante: 'Diamante',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

const fmt = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })
const fmtDate = new Intl.DateTimeFormat('es-PA')

function formatAmount(amount: number, currency: string): string {
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

interface PatrociniosTableProps {
  sponsorships: Sponsorship[]
  total: number
  page: number
  pageSize: number
  onPageChange?: (page: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatrociniosTable({
  sponsorships,
  total,
  page,
  pageSize,
  onPageChange,
}: PatrociniosTableProps) {
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
              <TableHead>Patrocinador</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Monto Anual</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsorships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay patrocinios registrados.
                </TableCell>
              </TableRow>
            ) : (
              sponsorships.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">
                    <span className="text-blue-700 font-mono text-xs">{s.sponsor_actor_id.slice(0, 8)}…</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs flex items-center gap-1 w-fit ${LEVEL_COLORS[s.level] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      <StarIcon className="h-3 w-3" />
                      {LEVEL_LABELS[s.level] ?? s.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">
                    {formatAmount(s.amount_annual, s.currency)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(s.start_date)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.end_date ? formatDate(s.end_date) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
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
