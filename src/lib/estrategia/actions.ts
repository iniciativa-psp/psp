'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStrategyItem, updateStrategyItem } from '@/lib/estrategia/api'
import type { StrategyLevel, StrategyStatus, RiskLevel } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: FormDataEntryValue | null): string | null {
  const s = value as string | null
  return s?.trim() || null
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function parseOdsGoals(value: FormDataEntryValue | null): number[] | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(Number).filter(n => !isNaN(n))
  } catch {
    // fallback: comma-separated
  }
  return value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
}

function buildStrategyPayload(formData: FormData) {
  return {
    level: formData.get('level') as StrategyLevel,
    parent_id: str(formData.get('parent_id')),
    code: (formData.get('code') as string)?.trim() ?? '',
    name: (formData.get('name') as string)?.trim() ?? '',
    description: str(formData.get('description')),
    objective: str(formData.get('objective')),
    status: str(formData.get('status')) as StrategyStatus | null,
    responsible_id: str(formData.get('responsible_id')),
    team_ids: [] as string[],
    start_date: str(formData.get('start_date')),
    end_date: str(formData.get('end_date')),
    budget_planned: parseOptionalNumber(formData.get('budget_planned')),
    budget_executed: null,
    currency: 'USD',
    kpi_target: parseOptionalNumber(formData.get('kpi_target')),
    kpi_current: null,
    kpi_unit: str(formData.get('kpi_unit')),
    ods_goals: parseOdsGoals(formData.get('ods_goals')),
    territorial_id: parseOptionalInt(formData.get('territorial_id')),
    risk_probability: (str(formData.get('risk_probability')) as RiskLevel | null) ?? null,
    risk_impact: (str(formData.get('risk_impact')) as RiskLevel | null) ?? null,
    is_active: true,
    created_by: null,
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createStrategyItemAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const raw = buildStrategyPayload(formData)

    if (!raw.level || !raw.code || !raw.name) {
      return { success: false, error: 'El nivel, código y nombre son obligatorios.' }
    }

    const payload = { ...raw, status: (raw.status ?? 'draft') as StrategyStatus }
    const item = await createStrategyItem(payload)

    revalidatePath('/dashboard/estrategia')
    return { success: true, id: item.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el ítem estratégico'
    return { success: false, error: message }
  }
}

export async function updateStrategyItemAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const raw = buildStrategyPayload(formData)

    if (!raw.code || !raw.name) {
      return { success: false, error: 'El código y nombre son obligatorios.' }
    }

    // Only include status in the update payload if it was explicitly set
    const { status, ...rest } = raw
    const payload = status != null ? { ...rest, status } : rest

    await updateStrategyItem(id, payload)

    revalidatePath('/dashboard/estrategia')
    revalidatePath(`/dashboard/estrategia/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el ítem estratégico'
    return { success: false, error: message }
  }
}

export async function changeStrategyStatusAction(
  id: string,
  newStatus: StrategyStatus,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current status first
    const { data: current, error: fetchErr } = await supabase
      .from('strategy_items')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchErr) throw new Error(`changeStrategyStatusAction: ${fetchErr.message}`)

    const oldStatus = current?.status ?? null

    // Update status
    await updateStrategyItem(id, { status: newStatus })

    // Insert log entry
    const { data: { user } } = await supabase.auth.getUser()
    const { error: logErr } = await supabase.from('strategy_status_log').insert({
      strategy_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: user?.id ?? null,
      notes: notes ?? null,
    })

    if (logErr) throw new Error(`changeStrategyStatusAction log: ${logErr.message}`)

    revalidatePath('/dashboard/estrategia')
    revalidatePath(`/dashboard/estrategia/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cambiar el estado'
    return { success: false, error: message }
  }
}
