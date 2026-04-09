'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MarketplaceCategory } from '@/types'

interface ProductFiltersProps {
  categories: MarketplaceCategory[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [tipo, setTipo] = useState(searchParams.get('tipo') ?? '')
  const [categoria, setCategoria] = useState(searchParams.get('categoria') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') ?? '')

  // Debounce function
  const debounce = useCallback(() => {
    let timer: ReturnType<typeof setTimeout>
    return (fn: () => void, delay = 300) => {
      clearTimeout(timer)
      timer = setTimeout(fn, delay)
    }
  }, [])()

  function buildParams(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    const current: Record<string, string> = {
      search,
      tipo,
      categoria,
      status,
      min_price: minPrice,
      max_price: maxPrice,
      ...overrides,
    }
    Object.entries(current).forEach(([k, v]) => {
      if (v) p.set(k, v)
    })
    return p.toString()
  }

  function navigate(overrides: Record<string, string>) {
    startTransition(() => {
      const q = buildParams(overrides)
      router.push(`${pathname}${q ? '?' + q : ''}`)
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    debounce(() => navigate({ search: value, page: '1' }), 300)
  }

  function handleSelect(key: string, value: string, setter: (v: string) => void) {
    setter(value)
    navigate({ [key]: value, page: '1' })
  }

  function handlePriceBlur() {
    navigate({ min_price: minPrice, max_price: maxPrice, page: '1' })
  }

  function handleClear() {
    setSearch('')
    setTipo('')
    setCategoria('')
    setStatus('')
    setMinPrice('')
    setMaxPrice('')
    router.push(pathname)
  }

  const hasFilters = !!(search || tipo || categoria || status || minPrice || maxPrice)

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Búsqueda */}
      <div className="relative min-w-[200px] flex-1">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tipo */}
      <select
        value={tipo}
        onChange={e => handleSelect('tipo', e.target.value, setTipo)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Todos los tipos</option>
        <option value="product">Producto</option>
        <option value="service">Servicio</option>
        <option value="digital">Digital</option>
        <option value="agricultural">Agrícola</option>
        <option value="artisanal">Artesanal</option>
      </select>

      {/* Categoría */}
      <select
        value={categoria}
        onChange={e => handleSelect('categoria', e.target.value, setCategoria)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Todas las categorías</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Estado */}
      <select
        value={status}
        onChange={e => handleSelect('status', e.target.value, setStatus)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Todos los estados</option>
        <option value="active">Activo</option>
        <option value="draft">Borrador</option>
        <option value="paused">Pausado</option>
        <option value="out_of_stock">Sin Stock</option>
        <option value="archived">Archivado</option>
      </select>

      {/* Precio mín */}
      <Input
        type="number"
        placeholder="Precio mín"
        value={minPrice}
        onChange={e => setMinPrice(e.target.value)}
        onBlur={handlePriceBlur}
        className="w-28"
        min={0}
      />

      {/* Precio máx */}
      <Input
        type="number"
        placeholder="Precio máx"
        value={maxPrice}
        onChange={e => setMaxPrice(e.target.value)}
        onBlur={handlePriceBlur}
        className="w-28"
        min={0}
      />

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5">
          <XIcon className="h-3.5 w-3.5" />
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
