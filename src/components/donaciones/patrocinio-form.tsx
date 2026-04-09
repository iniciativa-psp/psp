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
import { createPatrocinioAction } from '@/lib/donaciones/actions'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PatrocinioFormProps {
  trigger?: React.ReactNode
}

export function PatrocinioForm({ trigger }: PatrocinioFormProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Controlled selects
  const [level, setLevel] = useState('bronce')
  const [currency, setCurrency] = useState('USD')
  const [status, setStatus] = useState('active')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('level', level)
    formData.set('currency', currency)
    formData.set('status', status)

    startTransition(async () => {
      const result = await createPatrocinioAction(formData)
      if (result.success) {
        setOpen(false)
        setError(null)
      } else {
        setError(result.error ?? 'Error al registrar el patrocinio.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1">
            <PlusIcon className="h-4 w-4" />
            Nuevo Patrocinio
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo Patrocinio</SheetTitle>
          <SheetDescription>
            Registre un nuevo patrocinio corporativo o institucional.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Actor patrocinador */}
          <div className="space-y-1.5">
            <Label htmlFor="sponsor_actor_id">ID del patrocinador (Actor) *</Label>
            <Input
              id="sponsor_actor_id"
              name="sponsor_actor_id"
              placeholder="UUID del actor empresa/ONG..."
              required
            />
          </div>

          {/* Monto anual */}
          <div className="space-y-1.5">
            <Label htmlFor="amount_annual">Monto Anual *</Label>
            <Input
              id="amount_annual"
              name="amount_annual"
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

          {/* Nivel */}
          <div className="space-y-1.5">
            <Label>Nivel de patrocinio *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bronce">Bronce</SelectItem>
                <SelectItem value="plata">Plata</SelectItem>
                <SelectItem value="oro">Oro</SelectItem>
                <SelectItem value="platino">Platino</SelectItem>
                <SelectItem value="diamante">Diamante</SelectItem>
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
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha inicio */}
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Fecha de inicio *</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Fecha fin */}
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Fecha de fin</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
            />
          </div>

          {/* Derechos de marca */}
          <div className="space-y-1.5">
            <Label htmlFor="branding_rights">Derechos de marca / visibilidad</Label>
            <Input
              id="branding_rights"
              name="branding_rights"
              placeholder="Logo en eventos, web, etc."
            />
          </div>

          {/* URL contrato */}
          <div className="space-y-1.5">
            <Label htmlFor="contract_url">URL del contrato</Label>
            <Input
              id="contract_url"
              name="contract_url"
              type="url"
              placeholder="https://..."
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Observaciones adicionales..."
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
