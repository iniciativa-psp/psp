'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ACTOR_TYPE_LABELS,
  ACTOR_STATUS_LABELS,
  EDUCATION_LEVEL_LABELS,
  ECONOMIC_AGENT_LABELS,
  VULNERABLE_GROUP_LABELS,
  STRATEGIC_SECTOR_LABELS_FULL,
} from '@/types'
import type { Actor, ActorSummary, ActorType, ActorStatus, EconomicAgent, VulnerableGroup, StrategicSector } from '@/types'
import { createActorAction, updateActorAction } from '@/lib/actores/actions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const HAS_LEGAL_NAME: ActorType[] = [
  'empresa',
  'cooperativa',
  'ong',
  'institucion_publica',
  'agrupacion',
  'organismo_internacional',
  'medio_comunicacion',
]

const HAS_RUC: ActorType[] = ['empresa', 'cooperativa']
const HAS_INCOME: ActorType[] = ['persona_natural', 'hogar']

const VULNERABLE_GROUPS = Object.keys(VULNERABLE_GROUP_LABELS) as VulnerableGroup[]
const STRATEGIC_SECTORS = Object.keys(STRATEGIC_SECTOR_LABELS_FULL) as StrategicSector[]
const ECONOMIC_AGENTS = Object.keys(ECONOMIC_AGENT_LABELS) as EconomicAgent[]
const EDUCATION_LEVELS = Object.keys(EDUCATION_LEVEL_LABELS)

// ---------------------------------------------------------------------------
// Territorial selector
// ---------------------------------------------------------------------------

interface TerritorialSelectorProps {
  initialTerritorialId?: number | null
  onSelect: (id: number | null) => void
}

interface TerritorialOption {
  id: number
  name: string
}

function TerritorialSelector({ initialTerritorialId, onSelect }: TerritorialSelectorProps) {
  const [provincias, setProvincias] = useState<TerritorialOption[]>([])
  const [distritos, setDistritos] = useState<TerritorialOption[]>([])
  const [corregimientos, setCorregimientos] = useState<TerritorialOption[]>([])
  const [selectedProvincia, setSelectedProvincia] = useState<number | null>(null)
  const [selectedDistrito, setSelectedDistrito] = useState<number | null>(null)
  const [selectedCorregimiento, setSelectedCorregimiento] = useState<number | null>(initialTerritorialId ?? null)

  // Use a ref to always call the latest onSelect without re-running effects
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect })

  useEffect(() => {
    fetch('/api/territorial?type=provincias')
      .then(r => r.json())
      .then(setProvincias)
      .catch(() => {})
    // Notify parent of the initial value (may be pre-populated when editing)
    onSelectRef.current(initialTerritorialId ?? null)
  }, [initialTerritorialId])

  function handleProvinciaChange(value: number | null) {
    setSelectedProvincia(value)
    setSelectedDistrito(null)
    setDistritos([])
    setSelectedCorregimiento(null)
    setCorregimientos([])
    onSelectRef.current(null)
    if (value) {
      fetch(`/api/territorial?type=distritos&parent=${value}`)
        .then(r => r.json())
        .then(setDistritos)
        .catch(() => {})
    }
  }

  function handleDistritoChange(value: number | null) {
    setSelectedDistrito(value)
    setSelectedCorregimiento(null)
    setCorregimientos([])
    onSelectRef.current(null)
    if (value) {
      fetch(`/api/territorial?type=corregimientos&parent=${value}`)
        .then(r => r.json())
        .then(setCorregimientos)
        .catch(() => {})
    }
  }

  function handleCorregimientoChange(value: number | null) {
    setSelectedCorregimiento(value)
    onSelectRef.current(value)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="provincia">Provincia</Label>
        <select
          id="provincia"
          value={selectedProvincia ?? ''}
          onChange={e => handleProvinciaChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Provincia —</option>
          {provincias.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="distrito">Distrito</Label>
        <select
          id="distrito"
          value={selectedDistrito ?? ''}
          onChange={e => handleDistritoChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedProvincia}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— Distrito —</option>
          {distritos.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="corregimiento">Corregimiento</Label>
        <select
          id="corregimiento"
          value={selectedCorregimiento ?? ''}
          onChange={e => handleCorregimientoChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedDistrito}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— Corregimiento —</option>
          {corregimientos.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-checkbox helper
// ---------------------------------------------------------------------------

function CheckboxGroup({
  id,
  label,
  options,
  labels,
  selected,
  onChange,
}: {
  id: string
  label: string
  options: string[]
  labels: Record<string, string>
  selected: string[]
  onChange: (values: string[]) => void
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-1.5" id={id}>
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-input"
            />
            {labels[opt]}
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

interface ActorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actor?: Actor | ActorSummary | null
  canSetStatus?: boolean
}

export function ActorForm({ open, onOpenChange, actor, canSetStatus = false }: ActorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [actorType, setActorType] = useState<ActorType>(actor?.actor_type ?? 'persona_natural')
  const [fullName, setFullName] = useState(actor?.full_name ?? '')
  const [legalName, setLegalName] = useState(actor?.legal_name ?? '')
  const [idNumber, setIdNumber] = useState(actor?.id_number ?? '')
  const [ruc, setRuc] = useState(actor?.ruc ?? '')
  const [email, setEmail] = useState(actor?.email ?? '')
  const [phone, setPhone] = useState(actor?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(actor?.whatsapp ?? '')
  const [website, setWebsite] = useState(actor?.website ?? '')
  const [address, setAddress] = useState(actor?.address ?? '')
  const [territorialId, setTerritorialId] = useState<number | null>(actor?.territorial_id ?? null)
  const [incomeMonthly, setIncomeMonthly] = useState(actor?.income_monthly?.toString() ?? '')
  const [dependents, setDependents] = useState(actor?.dependents?.toString() ?? '')
  const [educationLevel, setEducationLevel] = useState(actor?.education_level ?? '')
  const [vulnerableGroups, setVulnerableGroups] = useState<string[]>(actor?.vulnerable_groups ?? [])
  const [strategicSectors, setStrategicSectors] = useState<string[]>(actor?.strategic_sectors ?? [])
  const [economicAgents, setEconomicAgents] = useState<string[]>(actor?.economic_agents ?? [])
  const [notes, setNotes] = useState(actor?.notes ?? '')
  const [status, setStatus] = useState<ActorStatus>(actor?.status ?? 'pending_verification')

  // Reset when actor changes
  useEffect(() => {
    if (actor) {
      setActorType(actor.actor_type)
      setFullName(actor.full_name)
      setLegalName(actor.legal_name ?? '')
      setIdNumber(actor.id_number ?? '')
      setRuc(actor.ruc ?? '')
      setEmail(actor.email ?? '')
      setPhone(actor.phone ?? '')
      setWhatsapp(actor.whatsapp ?? '')
      setWebsite(actor.website ?? '')
      setAddress(actor.address ?? '')
      setTerritorialId(actor.territorial_id ?? null)
      setIncomeMonthly(actor.income_monthly?.toString() ?? '')
      setDependents(actor.dependents?.toString() ?? '')
      setEducationLevel(actor.education_level ?? '')
      setVulnerableGroups(actor.vulnerable_groups ?? [])
      setStrategicSectors(actor.strategic_sectors ?? [])
      setEconomicAgents(actor.economic_agents ?? [])
      setNotes(actor.notes ?? '')
      setStatus(actor.status ?? 'pending_verification')
    } else {
      setActorType('persona_natural')
      setFullName('')
      setLegalName('')
      setIdNumber('')
      setRuc('')
      setEmail('')
      setPhone('')
      setWhatsapp('')
      setWebsite('')
      setAddress('')
      setTerritorialId(null)
      setIncomeMonthly('')
      setDependents('')
      setEducationLevel('')
      setVulnerableGroups([])
      setStrategicSectors([])
      setEconomicAgents([])
      setNotes('')
      setStatus('pending_verification')
    }
    setError(null)
  }, [actor, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.set('actor_type', actorType)
    formData.set('full_name', fullName)
    if (legalName) formData.set('legal_name', legalName)
    if (idNumber) formData.set('id_number', idNumber)
    if (ruc) formData.set('ruc', ruc)
    if (email) formData.set('email', email)
    if (phone) formData.set('phone', phone)
    if (whatsapp) formData.set('whatsapp', whatsapp)
    if (website) formData.set('website', website)
    if (address) formData.set('address', address)
    if (territorialId) formData.set('territorial_id', String(territorialId))
    if (incomeMonthly) formData.set('income_monthly', incomeMonthly)
    if (dependents) formData.set('dependents', dependents)
    if (educationLevel) formData.set('education_level', educationLevel)
    if (vulnerableGroups.length) formData.set('vulnerable_groups', JSON.stringify(vulnerableGroups))
    if (strategicSectors.length) formData.set('strategic_sectors', JSON.stringify(strategicSectors))
    if (economicAgents.length) formData.set('economic_agents', JSON.stringify(economicAgents))
    if (notes) formData.set('notes', notes)
    if (canSetStatus) formData.set('status', status)

    const result = actor
      ? await updateActorAction(actor.id, formData)
      : await createActorAction(formData)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Ocurrió un error inesperado.')
      return
    }

    router.refresh()
    onOpenChange(false)
  }

  const showLegalName = HAS_LEGAL_NAME.includes(actorType)
  const showRuc = HAS_RUC.includes(actorType)
  const showIncome = HAS_INCOME.includes(actorType)
  const waPreview = whatsapp
    ? `https://wa.me/507${whatsapp.replace(/\D/g, '').slice(-8)}`
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{actor ? 'Editar actor' : 'Nuevo actor'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de actor */}
          <div className="space-y-1.5">
            <Label htmlFor="actor_type">Tipo de actor <span className="text-destructive">*</span></Label>
            <select
              id="actor_type"
              value={actorType}
              onChange={e => setActorType(e.target.value as ActorType)}
              required
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ACTOR_TYPES.map(t => (
                <option key={t} value={t}>{ACTOR_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Nombre completo */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nombre completo del actor"
              required
            />
          </div>

          {/* Nombre legal (condicional) */}
          {showLegalName && (
            <div className="space-y-1.5">
              <Label htmlFor="legal_name">Nombre legal / razón social</Label>
              <Input
                id="legal_name"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="Razón social oficial"
              />
            </div>
          )}

          {/* Cédula / RUC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="id_number">
                {actorType === 'persona_natural' ? 'Número de cédula' : 'Número identificación'}
              </Label>
              <Input
                id="id_number"
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                placeholder="Ej. 8-123-456"
              />
            </div>
            {showRuc && (
              <div className="space-y-1.5">
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  value={ruc}
                  onChange={e => setRuc(e.target.value)}
                  placeholder="RUC de la empresa"
                />
              </div>
            )}
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="6123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="61234567"
              />
              {waPreview && (
                <p className="text-xs text-muted-foreground">
                  Link:{' '}
                  <a href={waPreview} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                    {waPreview}
                  </a>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://ejemplo.com"
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <textarea
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Dirección completa"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Selector territorial */}
          <div className="space-y-1.5">
            <Label>Ubicación territorial</Label>
            <TerritorialSelector
              initialTerritorialId={actor?.territorial_id}
              onSelect={setTerritorialId}
            />
          </div>

          {/* Datos socioeconómicos (persona_natural / hogar) */}
          {showIncome && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="income_monthly">Ingresos mensuales (USD)</Label>
                <Input
                  id="income_monthly"
                  type="number"
                  min={0}
                  step={0.01}
                  value={incomeMonthly}
                  onChange={e => setIncomeMonthly(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dependents">Dependientes</Label>
                <Input
                  id="dependents"
                  type="number"
                  min={0}
                  value={dependents}
                  onChange={e => setDependents(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="education_level">Nivel educativo</Label>
                <select
                  id="education_level"
                  value={educationLevel}
                  onChange={e => setEducationLevel(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Seleccionar —</option>
                  {EDUCATION_LEVELS.map(l => (
                    <option key={l} value={l}>{EDUCATION_LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Grupos vulnerables */}
          <CheckboxGroup
            id="vulnerable_groups"
            label="Grupos vulnerables"
            options={VULNERABLE_GROUPS}
            labels={VULNERABLE_GROUP_LABELS}
            selected={vulnerableGroups}
            onChange={setVulnerableGroups}
          />

          {/* Sectores estratégicos */}
          <CheckboxGroup
            id="strategic_sectors"
            label="Sectores estratégicos"
            options={STRATEGIC_SECTORS}
            labels={STRATEGIC_SECTOR_LABELS_FULL}
            selected={strategicSectors}
            onChange={setStrategicSectors}
          />

          {/* Agentes económicos */}
          <CheckboxGroup
            id="economic_agents"
            label="Agentes económicos"
            options={ECONOMIC_AGENTS}
            labels={ECONOMIC_AGENT_LABELS}
            selected={economicAgents}
            onChange={setEconomicAgents}
          />

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Estado (solo gestores+) */}
          {canSetStatus && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as ActorStatus)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(ACTOR_STATUS_LABELS) as ActorStatus[]).map(s => (
                  <option key={s} value={s}>{ACTOR_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {actor ? 'Guardar cambios' : 'Crear actor'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
