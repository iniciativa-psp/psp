'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EconomicActorSummary } from '@/types'

interface AgentesTableProps {
  data: EconomicActorSummary[]
  count: number
  page: number
  totalPages: number
}

const FORMALIZATION_COLORS: Record<string, string> = {
  informal:   'bg-red-100 text-red-800',
  en_proceso: 'bg-yellow-100 text-yellow-800',
  formal:     'bg-green-100 text-green-800',
}

const FORMALIZATION_LABELS: Record<string, string> = {
  informal:   'Informal',
  en_proceso: 'En Proceso',
  formal:     'Formal',
}

const AGENT_CATEGORY_COLORS: Record<string, string> = {
  micro:   'bg-blue-100 text-blue-800',
  pyme:    'bg-purple-100 text-purple-800',
  grande:  'bg-indigo-100 text-indigo-800',
  social:  'bg-teal-100 text-teal-800',
  general: 'bg-gray-100 text-gray-800',
}

export function AgentesTable({ data, count, page, totalPages }: AgentesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '')

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      if (key !== 'page') params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      updateParam('search', inputValue)
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [inputValue, updateParam])

  const search = searchParams.get('search') ?? ''

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre de actor..."
          value={inputValue}
          className="max-w-sm"
          onChange={e => setInputValue(e.target.value)}
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInputValue('')
              updateParam('search', '')
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-muted-foreground text-sm">
            {search ? 'Sin resultados para la búsqueda.' : 'Sin agentes económicos registrados aún.'}
          </div>
        </div>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Actor / Agente</th>
                    <th className="text-left font-semibold px-4 py-3">Sector Principal</th>
                    <th className="text-left font-semibold px-4 py-3">Tipo</th>
                    <th className="text-left font-semibold px-4 py-3">Formalización</th>
                    <th className="text-right font-semibold px-4 py-3">Empleados</th>
                    <th className="text-left font-semibold px-4 py-3">Territorio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr
                      key={row.profile_id}
                      className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                    >
                      <td className="px-4 py-3 font-medium">{row.actor_full_name}</td>
                      <td className="px-4 py-3">
                        {row.primary_sector_name ? (
                          <Badge variant="outline" className="text-xs">
                            {row.primary_sector_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.agent_type_name ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              AGENT_CATEGORY_COLORS[row.agent_category ?? 'general'] ??
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {row.agent_type_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            FORMALIZATION_COLORS[row.formalization_status] ??
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {FORMALIZATION_LABELS[row.formalization_status] ??
                            row.formalization_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.employees_count > 0 ? row.employees_count : '–'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {row.territorial_name ?? '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {data.length} de {count} agentes • Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateParam('page', String(page - 1))}
                  >
                    Anterior
                  </Button>
                )}
                {page < totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateParam('page', String(page + 1))}
                  >
                    Siguiente
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
