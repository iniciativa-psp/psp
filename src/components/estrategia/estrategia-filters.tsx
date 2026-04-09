'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { STRATEGY_LEVEL_LABELS, STRATEGY_STATUS_LABELS } from '@/types'
import type { StrategyLevel, StrategyStatus } from '@/types'

const LEVELS: StrategyLevel[] = ['plan', 'programa', 'proyecto', 'actividad']
const STATUSES: StrategyStatus[] = ['draft', 'review', 'approved', 'active', 'completed', 'cancelled']

const SELECT_CLS =
  'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[160px]'

export function EstrategiaFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [nivel, setNivel] = useState(searchParams.get('nivel') ?? '')
  const [estado, setEstado] = useState(searchParams.get('estado') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParams = useCallback(
    (s: string, n: string, e: string) => {
      const params = new URLSearchParams()
      if (s) params.set('search', s)
      if (n) params.set('nivel', n)
      if (e) params.set('estado', e)
      params.set('page', '1')
      router.replace(`/dashboard/estrategia?${params.toString()}`)
    },
    [router],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParams(search, nivel, estado), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, nivel, estado, updateParams])

  function handleClear() {
    setSearch('')
    setNivel('')
    setEstado('')
    router.replace('/dashboard/estrategia?page=1')
  }

  const hasFilters = search !== '' || nivel !== '' || estado !== ''

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por código o nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar ítems estratégicos"
        />
      </div>

      <select
        value={nivel}
        onChange={e => setNivel(e.target.value)}
        aria-label="Filtrar por nivel"
        className={SELECT_CLS}
      >
        <option value="">Todos los niveles</option>
        {LEVELS.map(l => (
          <option key={l} value={l}>{STRATEGY_LEVEL_LABELS[l]}</option>
        ))}
      </select>

      <select
        value={estado}
        onChange={e => setEstado(e.target.value)}
        aria-label="Filtrar por estado"
        className={SELECT_CLS}
      >
        <option value="">Todos los estados</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{STRATEGY_STATUS_LABELS[s]}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="outline" size="icon" onClick={handleClear} aria-label="Limpiar filtros">
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
