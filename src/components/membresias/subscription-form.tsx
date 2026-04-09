'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, SearchIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSubscriptionAction, updateSubscriptionAction } from '@/lib/membresias/actions'
import type { MembershipPlan, MembershipSummary } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SELECT_CLS =
  'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const PAYMENT_METHODS = [
  { value: 'yappy', label: 'Yappy' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'wallet', label: 'Wallet digital' },
  { value: 'subsidio', label: 'Subsidio' },
  { value: 'patrocinio', label: 'Patrocinio' },
  { value: 'manual', label: 'Manual' },
]

// ---------------------------------------------------------------------------
// Actor search field
// ---------------------------------------------------------------------------

interface ActorOption {
  id: string
  full_name: string
  actor_type: string
}

function ActorSearch({
  initialValue,
  onSelect,
}: {
  initialValue?: string
  onSelect: (id: string | null) => void
}) {
  const [query, setQuery] = useState(initialValue ?? '')
  const [results, setResults] = useState<ActorOption[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/actores-search?q=${encodeURIComponent(query)}&limit=8`)
        .then(r => r.json())
        .then((data: ActorOption[]) => {
          setResults(data)
          setOpen(true)
        })
        .catch(() => {})
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(actor: ActorOption) {
    setQuery(actor.full_name)
    setOpen(false)
    onSelect(actor.id)
  }

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar miembro…"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            onSelect(null)
          }}
          className="pl-9"
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.map(actor => (
            <button
              key={actor.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={() => handleSelect(actor)}
            >
              <span className="font-medium">{actor.full_name}</span>
              <span className="ml-2 text-muted-foreground text-xs">{actor.actor_type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plans: MembershipPlan[]
  membership?: MembershipSummary
}

export function SubscriptionForm({ open, onOpenChange, plans, membership }: SubscriptionFormProps) {
  const router = useRouter()
  const [actorId, setActorId] = useState<string | null>(membership?.actor_id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!membership

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    if (actorId) formData.set('actor_id', actorId)

    const result = isEdit
      ? await updateSubscriptionAction(membership.id, formData)
      : await createSubscriptionAction(formData)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Error al guardar la suscripción.')
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  const defaultPlanId = membership?.plan_id ?? ''
  const defaultStartAt = membership?.start_at
    ? membership.start_at.substring(0, 10)
    : new Date().toISOString().substring(0, 10)
  const defaultEndAt = membership?.end_at ? membership.end_at.substring(0, 10) : ''
  const defaultPaymentMethod = membership?.payment_method ?? ''
  const defaultAmount = membership?.amount_paid ?? null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar suscripción' : 'Nueva suscripción'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Miembro */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Miembro *</Label>
              <ActorSearch onSelect={setActorId} />
              <input type="hidden" name="actor_id" value={actorId ?? ''} />
            </div>
          )}

          {/* Plan */}
          <div className="space-y-1.5">
            <Label htmlFor="plan_id">Plan *</Label>
            <select
              id="plan_id"
              name="plan_id"
              className={SELECT_CLS}
              defaultValue={defaultPlanId}
              required
            >
              <option value="">Seleccionar plan…</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price_monthly}/mes
                </option>
              ))}
            </select>
          </div>

          {/* Fecha inicio */}
          <div className="space-y-1.5">
            <Label htmlFor="start_at">Fecha de inicio *</Label>
            <Input
              id="start_at"
              name="start_at"
              type="date"
              defaultValue={defaultStartAt}
              required
            />
          </div>

          {/* Fecha fin */}
          <div className="space-y-1.5">
            <Label htmlFor="end_at">Fecha de vencimiento</Label>
            <Input
              id="end_at"
              name="end_at"
              type="date"
              defaultValue={defaultEndAt}
            />
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Método de pago</Label>
            <select
              id="payment_method"
              name="payment_method"
              className={SELECT_CLS}
              defaultValue={defaultPaymentMethod}
            >
              <option value="">Seleccionar…</option>
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          {/* Monto pagado */}
          <div className="space-y-1.5">
            <Label htmlFor="amount_paid">Monto pagado (USD)</Label>
            <Input
              id="amount_paid"
              name="amount_paid"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={defaultAmount != null ? String(defaultAmount) : ''}
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones adicionales…"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear suscripción'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
