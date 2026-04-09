'use server'

import { revalidatePath } from 'next/cache'
import { createDonation, createSponsorship } from '@/lib/donaciones/api'
import type { Donation, Sponsorship } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: FormDataEntryValue | null): string | null {
  const s = value as string | null
  return s?.trim() || null
}

function num(value: FormDataEntryValue | null): number | null {
  const s = value as string | null
  if (!s?.trim()) return null
  const n = Number(s.trim())
  return isNaN(n) ? null : n
}

function bool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on'
}

// ---------------------------------------------------------------------------
// Donaciones
// ---------------------------------------------------------------------------

export async function createDonacionAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const amount = num(formData.get('amount'))
    if (!amount || amount <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0.' }
    }

    const payload: Omit<Donation, 'id' | 'created_at' | 'updated_at'> = {
      donor_actor_id: str(formData.get('donor_actor_id')),
      strategy_id: str(formData.get('strategy_id')),
      territorial_id: null,
      donation_type: (str(formData.get('donation_type')) ?? 'efectivo') as Donation['donation_type'],
      amount,
      currency: str(formData.get('currency')) ?? 'USD',
      description: str(formData.get('description')),
      is_recurring: bool(formData.get('is_recurring')),
      recurrence_period: str(formData.get('recurrence_period')) as Donation['recurrence_period'],
      certificate_code: str(formData.get('certificate_code')),
      certificate_issued_at: null,
      receipt_url: str(formData.get('receipt_url')),
      status: (str(formData.get('status')) ?? 'pending') as Donation['status'],
      donation_date: str(formData.get('donation_date')) ?? new Date().toISOString().split('T')[0],
      notes: str(formData.get('notes')),
      created_by: null,
    }

    const result = await createDonation(payload)
    revalidatePath('/dashboard/donaciones')
    return { success: true, id: result.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function updateDonacionAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const amount = num(formData.get('amount'))
    const updates: Partial<Omit<Donation, 'id' | 'created_at' | 'updated_at'>> = {}

    if (amount !== null) updates.amount = amount
    const currency = str(formData.get('currency'))
    if (currency !== null) updates.currency = currency
    const status = str(formData.get('status'))
    if (status !== null) updates.status = status as Donation['status']
    updates.notes = str(formData.get('notes'))
    updates.description = str(formData.get('description'))

    const { error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/donaciones')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Patrocinios
// ---------------------------------------------------------------------------

export async function createPatrocinioAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const sponsor_actor_id = str(formData.get('sponsor_actor_id'))
    if (!sponsor_actor_id) {
      return { success: false, error: 'Debe seleccionar un actor patrocinador.' }
    }
    const amount_annual = num(formData.get('amount_annual'))
    if (!amount_annual || amount_annual <= 0) {
      return { success: false, error: 'El monto anual debe ser mayor a 0.' }
    }
    const start_date = str(formData.get('start_date'))
    if (!start_date) {
      return { success: false, error: 'La fecha de inicio es requerida.' }
    }

    const payload: Omit<Sponsorship, 'id' | 'created_at' | 'updated_at'> = {
      sponsor_actor_id,
      strategy_id: str(formData.get('strategy_id')),
      territorial_id: null,
      level: (str(formData.get('level')) ?? 'bronce') as Sponsorship['level'],
      amount_annual,
      currency: str(formData.get('currency')) ?? 'USD',
      logo_url: str(formData.get('logo_url')),
      visibility_config: {},
      branding_rights: str(formData.get('branding_rights')),
      start_date,
      end_date: str(formData.get('end_date')),
      status: (str(formData.get('status')) ?? 'active') as Sponsorship['status'],
      contract_url: str(formData.get('contract_url')),
      notes: str(formData.get('notes')),
      created_by: null,
    }

    const result = await createSponsorship(payload)
    revalidatePath('/dashboard/donaciones')
    return { success: true, id: result.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function updatePatrocinioAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const updates: Partial<Omit<Sponsorship, 'id' | 'created_at' | 'updated_at'>> = {}

    const amount_annual = num(formData.get('amount_annual'))
    if (amount_annual !== null) updates.amount_annual = amount_annual
    const status = str(formData.get('status'))
    if (status !== null) updates.status = status as Sponsorship['status']
    const level = str(formData.get('level'))
    if (level !== null) updates.level = level as Sponsorship['level']
    updates.notes = str(formData.get('notes'))
    updates.end_date = str(formData.get('end_date'))

    const { error } = await supabase
      .from('sponsorships')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/donaciones')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}
