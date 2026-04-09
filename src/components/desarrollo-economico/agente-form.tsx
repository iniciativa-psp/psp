'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertEconomicProfileAction } from '@/lib/desarrollo-economico/actions'
import type { EconomicSector, EconomicAgentType, ActorEconomicProfile } from '@/types'

const SELECT_CLS =
  'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

interface AgenteFormProps {
  actorId: string
  actorName: string
  sectors: EconomicSector[]
  agentTypes: EconomicAgentType[]
  existingProfile?: ActorEconomicProfile | null
  trigger?: React.ReactNode
}

export function AgenteForm({
  actorId,
  actorName,
  sectors,
  agentTypes,
  existingProfile,
  trigger,
}: AgenteFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!existingProfile

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await upsertEconomicProfileAction(actorId, formData)
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? 'Error al guardar el perfil.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            {isEdit ? 'Editar Perfil Económico' : 'Agregar Perfil Económico'}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? 'Editar' : 'Registrar'} Perfil Económico
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{actorName}</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Sector */}
          <div className="space-y-1.5">
            <Label htmlFor="primary_sector_id">Sector Principal</Label>
            <select
              id="primary_sector_id"
              name="primary_sector_id"
              defaultValue={existingProfile?.primary_sector_id ?? ''}
              className={SELECT_CLS}
            >
              <option value="">— Seleccionar sector —</option>
              {sectors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name_short ?? s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de agente */}
          <div className="space-y-1.5">
            <Label htmlFor="economic_agent_type_id">Tipo de Agente</Label>
            <select
              id="economic_agent_type_id"
              name="economic_agent_type_id"
              defaultValue={existingProfile?.economic_agent_type_id ?? ''}
              className={SELECT_CLS}
            >
              <option value="">— Seleccionar tipo —</option>
              {agentTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formalización */}
          <div className="space-y-1.5">
            <Label htmlFor="formalization_status">Estado de Formalización</Label>
            <select
              id="formalization_status"
              name="formalization_status"
              defaultValue={existingProfile?.formalization_status ?? 'informal'}
              className={SELECT_CLS}
            >
              <option value="informal">Informal</option>
              <option value="en_proceso">En Proceso</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          {/* Empleados */}
          <div className="space-y-1.5">
            <Label htmlFor="employees_count">Número de Empleados</Label>
            <Input
              id="employees_count"
              name="employees_count"
              type="number"
              min={0}
              defaultValue={existingProfile?.employees_count ?? 0}
              placeholder="0"
            />
          </div>

          {/* Ingresos anuales */}
          <div className="space-y-1.5">
            <Label htmlFor="annual_revenue">Ingresos Anuales (USD)</Label>
            <Input
              id="annual_revenue"
              name="annual_revenue"
              type="number"
              min={0}
              step={0.01}
              defaultValue={existingProfile?.annual_revenue ?? ''}
              placeholder="0.00"
            />
          </div>

          {/* Registros */}
          <div className="space-y-2">
            <Label>Registros Oficiales</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'ruc_verified',       label: 'RUC Verificado' },
                { name: 'dgi_registered',     label: 'DGI' },
                { name: 'css_registered',     label: 'CSS' },
                { name: 'mitradel_registered',label: 'MITRADEL' },
              ].map(field => (
                <label key={field.name} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    value="true"
                    defaultChecked={
                      existingProfile
                        ? Boolean(existingProfile[field.name as keyof ActorEconomicProfile])
                        : false
                    }
                    className="rounded"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>

          {/* Capacidades */}
          <div className="space-y-2">
            <Label>Capacidades</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'export_ready',      label: 'Listo para Exportar' },
                { name: 'digital_marketing', label: 'Marketing Digital' },
              ].map(field => (
                <label key={field.name} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    value="true"
                    defaultChecked={
                      existingProfile
                        ? Boolean(existingProfile[field.name as keyof ActorEconomicProfile])
                        : false
                    }
                    className="rounded"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={existingProfile?.notes ?? ''}
              placeholder="Observaciones adicionales..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Registrar perfil'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
