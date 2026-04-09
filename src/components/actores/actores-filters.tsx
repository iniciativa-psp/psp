'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ACTOR_TYPE_LABELS, ACTOR_STATUS_LABELS } from '@/types'
import type { ActorType, ActorStatus } from '@/types'

const ACTOR_TYPES: ActorType[] = [
  'persona_natural',
  'hogar',
  'empresa',
  'cooperativa',
  'ong',
  'institucion_publica',
  'agrupacion',
  'organismo_internacional',
  'medio_comunicacion',
]

const ACTOR_STATUSES: ActorStatus[] = ['active', 'inactive', 'suspended', 'pending_verification']

export function ActoresFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [tipo, setTipo] = useState(searchParams.get('tipo') ?? '')
  const [estado, setEstado] = useState(searchParams.get('estado') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParams = useCallback(
    (newSearch: string, newTipo: string, newEstado: string) => {
      const params = new URLSearchParams()
      if (newSearch) params.set('search', newSearch)
      if (newTipo) params.set('tipo', newTipo)
      if (newEstado) params.set('estado', newEstado)
      params.set('page', '1')
      router.replace(`/dashboard/actores?${params.toString()}`)
    },
    [router],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams(search, tipo, estado)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, tipo, estado, updateParams])

  function handleClear() {
    setSearch('')
    setTipo('')
    setEstado('')
    router.replace('/dashboard/actores?page=1')
  }

  const hasFilters = search !== '' || tipo !== '' || estado !== ''

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nombre, cédula, RUC o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar actores"
        />
      </div>

      {/* Tipo */}
      <select
        value={tipo}
        onChange={e => setTipo(e.target.value)}
        aria-label="Filtrar por tipo de actor"
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[180px]"
      >
        <option value="">Todos los tipos</option>
        {ACTOR_TYPES.map(t => (
          <option key={t} value={t}>
            {ACTOR_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      {/* Estado */}
      <select
        value={estado}
        onChange={e => setEstado(e.target.value)}
        aria-label="Filtrar por estado"
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[160px]"
      >
        <option value="">Todos los estados</option>
        {ACTOR_STATUSES.map(s => (
          <option key={s} value={s}>
            {ACTOR_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <Button variant="outline" size="icon" onClick={handleClear} aria-label="Limpiar filtros">
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
