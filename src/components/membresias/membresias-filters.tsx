'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MembershipPlan } from '@/types'

interface MembresiasFiltersProps {
  plans: MembershipPlan[]
}

export function MembresiasFilters({ plans }: MembresiasFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [plan, setPlan] = useState(searchParams.get('plan') ?? '')
  const [estado, setEstado] = useState(searchParams.get('estado') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParams = useCallback(
    (newSearch: string, newPlan: string, newEstado: string) => {
      const params = new URLSearchParams()
      if (newSearch) params.set('search', newSearch)
      if (newPlan) params.set('plan', newPlan)
      if (newEstado) params.set('estado', newEstado)
      params.set('page', '1')
      router.replace(`/dashboard/membresias?${params.toString()}`)
    },
    [router],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams(search, plan, estado)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, plan, estado, updateParams])

  function handleClear() {
    setSearch('')
    setPlan('')
    setEstado('')
    router.replace('/dashboard/membresias?page=1')
  }

  const hasFilters = search !== '' || plan !== '' || estado !== ''

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Búsqueda */}
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar miembro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar miembro"
        />
      </div>

      {/* Plan */}
      <select
        value={plan}
        onChange={e => setPlan(e.target.value)}
        aria-label="Filtrar por plan"
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[180px]"
      >
        <option value="">Todos los planes</option>
        {plans.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
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
        <option value="active">Activo</option>
        <option value="suspended">Suspendido</option>
        <option value="cancelled">Cancelado</option>
        <option value="expired">Vencido</option>
        <option value="pending">Pendiente</option>
        <option value="past_due">En mora</option>
      </select>

      {/* Limpiar */}
      {hasFilters && (
        <Button variant="outline" size="icon" onClick={handleClear} aria-label="Limpiar filtros">
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

