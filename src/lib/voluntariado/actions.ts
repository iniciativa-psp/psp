'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Actions — Oportunidades de voluntariado
// ---------------------------------------------------------------------------

export async function createOpportunityAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient()

    const title = (formData.get('title') as string | null)?.trim()
    if (!title) {
      return { success: false, error: 'El título es obligatorio.' }
    }

    const slotsRaw = formData.get('slots_available')
    const slots = slotsRaw ? parseInt(slotsRaw as string, 10) : 1

    const { data, error } = await supabase
      .from('volunteer_opportunities')
      .insert({
        title,
        description: (formData.get('description') as string | null)?.trim() || null,
        sector: (formData.get('sector') as string | null)?.trim() || null,
        slots_available: isNaN(slots) ? 1 : slots,
        slots_filled: 0,
        skills_required: (formData.get('skills_required') as string | null)?.trim() || null,
        hours_per_week: (() => {
          const v = formData.get('hours_per_week')
          if (!v || typeof v !== 'string' || v.trim() === '') return null
          const n = Number(v)
          return isNaN(n) ? null : n
        })(),
        is_remote: formData.get('is_remote') === 'true',
        start_date: (formData.get('start_date') as string | null)?.trim() || null,
        end_date: (formData.get('end_date') as string | null)?.trim() || null,
        status: (formData.get('status') as string | null)?.trim() ?? 'open',
        is_active: true,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/voluntariado')
    return { success: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear la oportunidad'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Actions — Postulaciones
// ---------------------------------------------------------------------------

export async function applyToOpportunityAction(
  actorId: string,
  opportunityId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('volunteer_registrations')
      .insert({
        opportunity_id: opportunityId,
        actor_id: actorId,
        status: 'pending',
        hours_logged: 0,
      })

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/voluntariado')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al postularse a la oportunidad'
    return { success: false, error: message }
  }
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('volunteer_registrations')
      .update({ status })
      .eq('id', applicationId)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/voluntariado')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el estado'
    return { success: false, error: message }
  }
}
