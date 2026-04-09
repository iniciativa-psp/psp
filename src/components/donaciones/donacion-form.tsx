'use client'

import { useState, useTransition } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDonacionAction } from '@/lib/donaciones/actions'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DonacionFormProps {
  trigger?: React.ReactNode
}

export function DonacionForm({ trigger }: DonacionFormProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Controlled selects
  const [donationType, setDonationType] = useState('efectivo')
  const [currency, setCurrency] = useState('USD')
  const [status, setStatus] = useState('pending')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('donation_type', donationType)
    formData.set('currency', currency)
    formData.set('status', status)

    startTransition(async () => {
      const result = await createDonacionAction(formData)
      if (result.success) {
        setOpen(false)
        setError(null)
      } else {
        setError(result.error ?? 'Error al registrar la donación.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1">
            <PlusIcon className="h-4 w-4" />
            Registrar Donación
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar Donación</SheetTitle>
          <SheetDescription>
            Complete los datos para registrar una nueva donación.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <Label>Moneda *</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — Dólar americano</SelectItem>
                <SelectItem value="PAB">PAB — Balboa panameño</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de donación */}
          <div className="space-y-1.5">
            <Label>Tipo de donación *</Label>
            <Select value={donationType} onValueChange={setDonationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="especie">En especie</SelectItem>
                <SelectItem value="voluntariado">Voluntariado</SelectItem>
                <SelectItem value="servicios">Servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <Label>Estado *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="donation_date">Fecha de donación</Label>
            <Input
              id="donation_date"
              name="donation_date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Actor donante (ID) */}
          <div className="space-y-1.5">
            <Label htmlFor="donor_actor_id">ID del donante (Actor)</Label>
            <Input
              id="donor_actor_id"
              name="donor_actor_id"
              placeholder="UUID del actor (opcional)"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              placeholder="Descripción breve de la donación"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Notas u observaciones..."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
