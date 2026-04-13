'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'

import type { MembershipPlan } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface MembresiasFiltersProps {
  plans: MembershipPlan[]
  basePath?: string
}

export function MembresiasFilters({ plans, basePath = '/dashboard/membresias' }: MembresiasFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initial = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString())
    return {
      search: params.get('search') ?? '',
      plan: params.get('plan') ?? '',
      estado: params.get('estado') ?? '',
    }
  }, [searchParams])

  const [search, setSearch] = useState(initial.search)
  const [plan, setPlan] = useState(initial.plan)
  const [estado, setEstado] = useState(initial.estado)

  useEffect(() => {
    setSearch(initial.search)
    setPlan(initial.plan)
    setEstado(initial.estado)
  }, [initial])

  const handleApply = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString())

    if (search) params.set('search', search)
    else params.delete('search')

    if (plan) params.set('plan', plan)
    else params.delete('plan')

    if (estado) params.set('estado', estado)
    else params.delete('estado')

    params.set('page', '1')
    router.replace(`${basePath}?${params.toString()}`)
  }, [router, basePath, searchParams, search, plan, estado])

  const handleClear = useCallback(() => {
    setSearch('')
    setPlan('')
    setEstado('')
    router.replace(`${basePath}?page=1`)
  }, [router, basePath])

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
          onKeyDown={e => {
            if (e.key === 'Enter') handleApply()
          }}
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

      {/* Aplicar / Limpiar */}
      <Button variant="outline" onClick={handleApply}>
        Aplicar
      </Button>

      {hasFilters && (
        <Button variant="outline" size="icon" onClick={handleClear} aria-label="Limpiar filtros">
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
