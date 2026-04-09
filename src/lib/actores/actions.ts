'use server'

import { revalidatePath } from 'next/cache'
import { createActor, updateActor } from '@/lib/actores/api'
import type { ActorType, ActorStatus } from '@/types'

function parseStringArray(value: FormDataEntryValue | null): string[] | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts : null
  }
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

function str(value: FormDataEntryValue | null): string | null {
  const s = value as string | null
  return s?.trim() || null
}

/** Build the shared actor fields from FormData. */
function buildActorPayload(formData: FormData) {
  return {
    actor_type: formData.get('actor_type') as ActorType,
    full_name: (formData.get('full_name') as string).trim(),
    legal_name: str(formData.get('legal_name')),
    id_number: str(formData.get('id_number')),
    ruc: str(formData.get('ruc')),
    email: str(formData.get('email')),
    phone: str(formData.get('phone')),
    whatsapp: str(formData.get('whatsapp')),
    website: str(formData.get('website')),
    territorial_id: parseOptionalNumber(formData.get('territorial_id')),
    address: str(formData.get('address')),
    income_monthly: parseOptionalNumber(formData.get('income_monthly')),
    dependents: parseOptionalNumber(formData.get('dependents')),
    education_level: str(formData.get('education_level')),
    vulnerable_groups: parseStringArray(formData.get('vulnerable_groups')),
    strategic_sectors: parseStringArray(formData.get('strategic_sectors')),
    economic_agents: parseStringArray(formData.get('economic_agents')),
    notes: str(formData.get('notes')),
    status: (str(formData.get('status')) ?? 'pending_verification') as ActorStatus,
  }
}

export async function createActorAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { actor_type, full_name, ...rest } = buildActorPayload(formData)

    if (!actor_type || !full_name) {
      return { success: false, error: 'El tipo y nombre completo son obligatorios.' }
    }

    const actor = await createActor({
      actor_type,
      full_name,
      ...rest,
      is_active: true,
      latitude: null,
      longitude: null,
      social_score: null,
      risk_score: null,
      logo_url: null,
      avatar_url: null,
      created_by: null,
    })

    revalidatePath('/dashboard/actores')
    return { success: true, id: actor.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el actor'
    return { success: false, error: message }
  }
}

export async function updateActorAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = buildActorPayload(formData)

    if (!payload.actor_type || !payload.full_name) {
      return { success: false, error: 'El tipo y nombre completo son obligatorios.' }
    }

    await updateActor(id, payload)

    revalidatePath('/dashboard/actores')
    revalidatePath(`/dashboard/actores/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el actor'
    return { success: false, error: message }
  }
}
