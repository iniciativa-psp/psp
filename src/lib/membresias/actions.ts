'use server'

import { revalidatePath } from 'next/cache'
import { createMembership, updateMembership } from '@/lib/membresias/api'
import type { MembershipStatus } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentMethod =
  | 'yappy'
  | 'tarjeta'
  | 'transferencia'
  | 'efectivo'
  | 'wallet'
  | 'subsidio'
  | 'patrocinio'
  | 'manual'
  | null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: FormDataEntryValue | null): string | null {
  const s = value as string | null
  return s?.trim() || null
}

function addOneMonth(from: Date): Date {
  const result = new Date(from)
  const day = result.getDate()
  result.setMonth(result.getMonth() + 1)
  // If setMonth overflowed (e.g. Jan 31 → Mar 2), roll back to last day of target month
  if (result.getDate() !== day) {
    result.setDate(0)
  }
  return result
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createSubscriptionAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const actor_id = str(formData.get('actor_id'))
    const plan_id = str(formData.get('plan_id'))
    const start_at = str(formData.get('start_at'))
    const end_at = str(formData.get('end_at'))
    const payment_method = str(formData.get('payment_method'))
    const notes = str(formData.get('notes'))
    const amount_paid_raw = str(formData.get('amount_paid'))
    const amount_paid = amount_paid_raw ? Number(amount_paid_raw) : null

    if (!actor_id) return { success: false, error: 'El miembro es requerido.' }
    if (!plan_id) return { success: false, error: 'El plan es requerido.' }

    const membership = await createMembership({
      actor_id,
      plan_id,
      status: 'active' as MembershipStatus,
      start_at: start_at ?? new Date().toISOString(),
      end_at: end_at ?? null,
      renew_at: null,
      grace_period_days: 7,
      auto_renew: true,
      cancel_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      suspended_at: null,
      suspended_reason: null,
      suspended_by: null,
      amount_paid,
      payment_method: payment_method as PaymentMethod,
      metadata: notes ? { notes } : {},
      created_by: null,
    })

    revalidatePath('/dashboard/membresias')
    return { success: true, id: membership.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function updateSubscriptionAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const plan_id = str(formData.get('plan_id'))
    const start_at = str(formData.get('start_at'))
    const end_at = str(formData.get('end_at'))
    const payment_method = str(formData.get('payment_method'))
    const notes = str(formData.get('notes'))
    const amount_paid_raw = str(formData.get('amount_paid'))
    const amount_paid = amount_paid_raw ? Number(amount_paid_raw) : undefined

    await updateMembership(id, {
      ...(plan_id ? { plan_id } : {}),
      ...(start_at ? { start_at } : {}),
      ...(end_at !== undefined ? { end_at } : {}),
      ...(payment_method !== undefined ? { payment_method: payment_method as PaymentMethod } : {}),
      ...(amount_paid !== undefined ? { amount_paid } : {}),
      ...(notes !== undefined ? { metadata: { notes } } : {}),
    })

    revalidatePath('/dashboard/membresias')
    revalidatePath(`/dashboard/membresias/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function cancelSubscriptionAction(
  id: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateMembership(id, {
      status: 'cancelled' as MembershipStatus,
      cancel_reason: reason ?? null,
      cancelled_at: new Date().toISOString(),
    })

    revalidatePath('/dashboard/membresias')
    revalidatePath(`/dashboard/membresias/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function renewSubscriptionAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const newEndAt = addOneMonth(new Date())

    await updateMembership(id, {
      status: 'active' as MembershipStatus,
      end_at: newEndAt.toISOString(),
      renew_at: newEndAt.toISOString(),
      cancel_reason: null,
      cancelled_at: null,
      suspended_at: null,
      suspended_reason: null,
    })

    revalidatePath('/dashboard/membresias')
    revalidatePath(`/dashboard/membresias/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}
