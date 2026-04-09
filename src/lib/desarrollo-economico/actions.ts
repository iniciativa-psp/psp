'use server'

import { revalidatePath } from 'next/cache'
import { upsertActorEconomicProfile } from '@/lib/desarrollo-economico/api'

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

function parseBool(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1' || value === 'on'
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza el perfil económico de un actor.
 * Se usa tanto para creación (actor sin perfil) como para edición (actor con perfil).
 */
export async function upsertEconomicProfileAction(
  actorId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!actorId) {
      return { success: false, error: 'El actor_id es obligatorio.' }
    }

    const payload = {
      economic_agent_type_id: parseOptionalInt(formData.get('economic_agent_type_id')),
      primary_sector_id: parseOptionalInt(formData.get('primary_sector_id')),
      secondary_sector_ids: [] as number[],
      annual_revenue: parseOptionalNumber(formData.get('annual_revenue')),
      employees_count: parseOptionalInt(formData.get('employees_count')) ?? 0,
      formalization_status:
        str(formData.get('formalization_status')) ?? 'informal',
      ruc_verified: parseBool(formData.get('ruc_verified')),
      dgi_registered: parseBool(formData.get('dgi_registered')),
      css_registered: parseBool(formData.get('css_registered')),
      mitradel_registered: parseBool(formData.get('mitradel_registered')),
      services_used: [] as number[],
      certifications: null as string[] | null,
      export_ready: parseBool(formData.get('export_ready')),
      digital_marketing: parseBool(formData.get('digital_marketing')),
      notes: str(formData.get('notes')),
    }

    const result = await upsertActorEconomicProfile(actorId, payload)

    revalidatePath('/dashboard/desarrollo-economico')
    revalidatePath(`/dashboard/actores/${actorId}`)

    return { success: true, id: result.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}
