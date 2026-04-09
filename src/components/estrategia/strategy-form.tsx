'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, SearchIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  STRATEGY_LEVEL_LABELS,
  STRATEGY_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  ODS_LABELS,
  ODS_COLORS,
} from '@/types'
import type {
  StrategyItem,
  StrategySummary,
  StrategyLevel,
  StrategyStatus,
  RiskLevel,
} from '@/types'
import { createStrategyItemAction, updateStrategyItemAction } from '@/lib/estrategia/actions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVELS: StrategyLevel[] = ['plan', 'programa', 'proyecto', 'actividad']
const STATUSES: StrategyStatus[] = ['draft', 'review', 'approved', 'active', 'completed', 'cancelled']
const RISK_LEVELS: RiskLevel[] = ['very_low', 'low', 'medium', 'high', 'very_high']
const ODS_NUMBERS = Array.from({ length: 17 }, (_, i) => i + 1)

const SELECT_CLS =
  'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

// ---------------------------------------------------------------------------
// Territorial selector (province → district only)
// ---------------------------------------------------------------------------

interface TerritorialOption { id: number; name: string }

function TerritorialSelector({
  initialId,
  onSelect,
}: {
  initialId?: number | null
  onSelect: (id: number | null) => void
}) {
  const [provincias, setProvincias] = useState<TerritorialOption[]>([])
  const [distritos, setDistritos] = useState<TerritorialOption[]>([])
  const [selectedProvincia, setSelectedProvincia] = useState<number | null>(null)
  const [selectedDistrito, setSelectedDistrito] = useState<number | null>(initialId ?? null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect })

  useEffect(() => {
    fetch('/api/territorial?type=provincias')
      .then(r => r.json())
      .then(setProvincias)
      .catch(() => {})
    onSelectRef.current(initialId ?? null)
  }, [initialId])

  function handleProvinciaChange(value: number | null) {
    setSelectedProvincia(value)
    setSelectedDistrito(null)
    setDistritos([])
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
    onSelectRef.current(value)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Provincia</Label>
        <select
          value={selectedProvincia ?? ''}
          onChange={e => handleProvinciaChange(e.target.value ? Number(e.target.value) : null)}
          className={SELECT_CLS}
        >
          <option value="">— Provincia —</option>
          {provincias.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Distrito</Label>
        <select
          value={selectedDistrito ?? ''}
          onChange={e => handleDistritoChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedProvincia}
          className={`${SELECT_CLS} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">— Distrito —</option>
          {distritos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Responsible search
// ---------------------------------------------------------------------------

interface ActorOption { id: string; full_name: string; actor_type: string }

function ResponsibleSearch({
  initialId,
  initialName,
  onChange,
}: {
  initialId?: string | null
  initialName?: string
  onChange: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ActorOption[]>([])
  const [selectedName, setSelectedName] = useState(initialName ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync state when props change (e.g. when form opens with a different item)
  useEffect(() => {
    setSelectedName(initialName ?? '')
  }, [initialId, initialName])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/actores-search?q=${encodeURIComponent(query)}&limit=10`)
        .then(r => r.json())
        .then(setResults)
        .catch(() => {})
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function select(actor: ActorOption) {
    setSelectedName(actor.full_name)
    setQuery('')
    setResults([])
    onChange(actor.id, actor.full_name)
  }

  function clear() {
    setSelectedName('')
    onChange('', '')
  }

  return (
    <div className="relative space-y-1.5">
      <Label>Responsable</Label>
      {selectedName && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md border border-input bg-muted/30 text-sm">
          <span>{selectedName}</span>
          <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground text-xs ml-2">
            ✕
          </button>
        </div>
      )}
      {!selectedName && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar actor…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {results.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.map(a => (
            <li
              key={a.id}
              onClick={() => select(a)}
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
            >
              {a.full_name}
              <span className="ml-1 text-xs text-muted-foreground">({a.actor_type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ODS checkboxes
// ---------------------------------------------------------------------------

function OdsCheckboxes({
  selected,
  onChange,
}: {
  selected: number[]
  onChange: (goals: number[]) => void
}) {
  function toggle(n: number) {
    if (selected.includes(n)) {
      onChange(selected.filter(g => g !== n))
    } else {
      onChange([...selected, n])
    }
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {ODS_NUMBERS.map(n => (
        <label key={n} className="flex items-center gap-1.5 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={selected.includes(n)}
            onChange={() => toggle(n)}
            className="rounded border-input"
          />
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-white font-bold text-[10px] shrink-0"
            style={{ backgroundColor: ODS_COLORS[n] }}
          >
            {n}
          </span>
          <span className="truncate">{ODS_LABELS[n]}</span>
        </label>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

interface StrategyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: StrategyItem | StrategySummary | null
  canSetStatus?: boolean
}

export function StrategyForm({ open, onOpenChange, item, canSetStatus = false }: StrategyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fields
  const [level, setLevel] = useState<StrategyLevel>(item?.level ?? 'plan')
  const [parentId, setParentId] = useState(item?.parent_id ?? '')
  const [code, setCode] = useState(item?.code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [objective, setObjective] = useState(item?.objective ?? '')
  const [status, setStatus] = useState<StrategyStatus>(item?.status ?? 'draft')
  const [responsibleId, setResponsibleId] = useState(item?.responsible_id ?? '')
  const [responsibleName, setResponsibleName] = useState(
    'responsible_name' in (item ?? {}) ? (item as { responsible_name?: string | null }).responsible_name ?? '' : ''
  )
  const [startDate, setStartDate] = useState(item?.start_date ?? '')
  const [endDate, setEndDate] = useState(item?.end_date ?? '')
  const [budgetPlanned, setBudgetPlanned] = useState(item?.budget_planned?.toString() ?? '')
  const [kpiTarget, setKpiTarget] = useState(item?.kpi_target?.toString() ?? '')
  const [kpiUnit, setKpiUnit] = useState(item?.kpi_unit ?? '')
  const [territorialId, setTerritorialId] = useState<number | null>(item?.territorial_id ?? null)
  const [odsGoals, setOdsGoals] = useState<number[]>(item?.ods_goals ?? [])
  const [riskProbability, setRiskProbability] = useState<RiskLevel | ''>(item?.risk_probability ?? '')
  const [riskImpact, setRiskImpact] = useState<RiskLevel | ''>(item?.risk_impact ?? '')

  // Reset on open/item change
  useEffect(() => {
    setLevel(item?.level ?? 'plan')
    setParentId(item?.parent_id ?? '')
    setCode(item?.code ?? '')
    setName(item?.name ?? '')
    setDescription(item?.description ?? '')
    setObjective(item?.objective ?? '')
    setStatus(item?.status ?? 'draft')
    setResponsibleId(item?.responsible_id ?? '')
    setResponsibleName(
      'responsible_name' in (item ?? {}) ? (item as { responsible_name?: string | null }).responsible_name ?? '' : ''
    )
    setStartDate(item?.start_date ?? '')
    setEndDate(item?.end_date ?? '')
    setBudgetPlanned(item?.budget_planned?.toString() ?? '')
    setKpiTarget(item?.kpi_target?.toString() ?? '')
    setKpiUnit(item?.kpi_unit ?? '')
    setTerritorialId(item?.territorial_id ?? null)
    setOdsGoals(item?.ods_goals ?? [])
    setRiskProbability(item?.risk_probability ?? '')
    setRiskImpact(item?.risk_impact ?? '')
    setError(null)
  }, [item, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!code.trim() || !name.trim()) {
      setError('El código y nombre son obligatorios.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.set('level', level)
    if (parentId) formData.set('parent_id', parentId)
    formData.set('code', code)
    formData.set('name', name)
    if (description) formData.set('description', description)
    if (objective) formData.set('objective', objective)
    if (canSetStatus) formData.set('status', status)
    if (responsibleId) formData.set('responsible_id', responsibleId)
    if (startDate) formData.set('start_date', startDate)
    if (endDate) formData.set('end_date', endDate)
    if (budgetPlanned) formData.set('budget_planned', budgetPlanned)
    if (kpiTarget) formData.set('kpi_target', kpiTarget)
    if (kpiUnit) formData.set('kpi_unit', kpiUnit)
    if (territorialId) formData.set('territorial_id', String(territorialId))
    if (odsGoals.length) formData.set('ods_goals', JSON.stringify(odsGoals))
    if (riskProbability) formData.set('risk_probability', riskProbability)
    if (riskImpact) formData.set('risk_impact', riskImpact)

    const result = item
      ? await updateStrategyItemAction(item.id, formData)
      : await createStrategyItemAction(formData)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Ocurrió un error inesperado.')
      return
    }

    router.refresh()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>
            {item ? 'Editar ítem estratégico' : 'Nueva entrada estratégica'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nivel */}
          <div className="space-y-1.5">
            <Label htmlFor="level">Nivel <span className="text-destructive">*</span></Label>
            <select
              id="level"
              value={level}
              onChange={e => setLevel(e.target.value as StrategyLevel)}
              disabled={!!item}
              required
              className={`${SELECT_CLS} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {LEVELS.map(l => (
                <option key={l} value={l}>{STRATEGY_LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>

          {/* Parent ID */}
          {level !== 'plan' && (
            <div className="space-y-1.5">
              <Label htmlFor="parent_id">ID del ítem padre</Label>
              <Input
                id="parent_id"
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                placeholder="UUID del plan/programa/proyecto padre"
              />
            </div>
          )}

          {/* Código y Nombre */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ej. PL-001"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del ítem"
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Descripción del ítem estratégico"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Objetivo */}
          <div className="space-y-1.5">
            <Label htmlFor="objective">Objetivo</Label>
            <textarea
              id="objective"
              value={objective}
              onChange={e => setObjective(e.target.value)}
              rows={2}
              placeholder="Objetivo estratégico"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Estado (solo gestores+) */}
          {canSetStatus && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as StrategyStatus)}
                className={SELECT_CLS}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STRATEGY_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Responsable */}
          <ResponsibleSearch
            initialId={responsibleId || undefined}
            initialName={responsibleName || undefined}
            onChange={(id, n) => { setResponsibleId(id); setResponsibleName(n) }}
          />

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha de cierre</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Presupuesto */}
          <div className="space-y-1.5">
            <Label htmlFor="budget_planned">Presupuesto planificado (USD)</Label>
            <Input
              id="budget_planned"
              type="number"
              min={0}
              step="0.01"
              value={budgetPlanned}
              onChange={e => setBudgetPlanned(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpi_target">Meta KPI</Label>
              <Input
                id="kpi_target"
                type="number"
                min={0}
                step="any"
                value={kpiTarget}
                onChange={e => setKpiTarget(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kpi_unit">Unidad KPI</Label>
              <Input
                id="kpi_unit"
                value={kpiUnit}
                onChange={e => setKpiUnit(e.target.value)}
                placeholder="Ej. beneficiarios, %"
              />
            </div>
          </div>

          {/* Territorio */}
          <div className="space-y-1.5">
            <Label>Territorio</Label>
            <TerritorialSelector
              initialId={item?.territorial_id}
              onSelect={setTerritorialId}
            />
          </div>

          {/* ODS */}
          <div className="space-y-2">
            <Label>Objetivos de Desarrollo Sostenible (ODS)</Label>
            <OdsCheckboxes selected={odsGoals} onChange={setOdsGoals} />
          </div>

          {/* Riesgo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="risk_probability">Probabilidad de riesgo</Label>
              <select
                id="risk_probability"
                value={riskProbability}
                onChange={e => setRiskProbability(e.target.value as RiskLevel | '')}
                className={SELECT_CLS}
              >
                <option value="">— Sin definir —</option>
                {RISK_LEVELS.map(r => (
                  <option key={r} value={r}>{RISK_LEVEL_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk_impact">Impacto del riesgo</Label>
              <select
                id="risk_impact"
                value={riskImpact}
                onChange={e => setRiskImpact(e.target.value as RiskLevel | '')}
                className={SELECT_CLS}
              >
                <option value="">— Sin definir —</option>
                {RISK_LEVELS.map(r => (
                  <option key={r} value={r}>{RISK_LEVEL_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Guardar cambios' : 'Crear ítem'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
