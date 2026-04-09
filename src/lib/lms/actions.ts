'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enrollInCourse, updateEnrollmentProgress } from '@/lib/lms/api'

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

// ---------------------------------------------------------------------------
// Actions — Cursos
// ---------------------------------------------------------------------------

export async function createCourseAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient()

    const name = str(formData.get('name'))
    const code = str(formData.get('code'))
    if (!name || !code) {
      return { success: false, error: 'El nombre y código son obligatorios.' }
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        code,
        name,
        description: str(formData.get('description')),
        category: str(formData.get('category')),
        modality: str(formData.get('modality')) ?? 'virtual',
        duration_hours: parseOptionalNumber(formData.get('duration_hours')),
        max_participants: (() => {
          const n = parseOptionalNumber(formData.get('max_participants'))
          return n !== null ? Math.round(n) : null
        })(),
        passing_score: parseOptionalNumber(formData.get('passing_score')) ?? 70,
        status: str(formData.get('status')) ?? 'draft',
        start_date: str(formData.get('start_date')),
        end_date: str(formData.get('end_date')),
        is_active: true,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/lms')
    return { success: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear el curso'
    return { success: false, error: message }
  }
}

export async function updateCourseAction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const name = str(formData.get('name'))
    if (!name) {
      return { success: false, error: 'El nombre es obligatorio.' }
    }

    const { error } = await supabase
      .from('courses')
      .update({
        name,
        description: str(formData.get('description')),
        category: str(formData.get('category')),
        modality: str(formData.get('modality')) ?? 'virtual',
        duration_hours: parseOptionalNumber(formData.get('duration_hours')),
        max_participants: (() => {
          const n = parseOptionalNumber(formData.get('max_participants'))
          return n !== null ? Math.round(n) : null
        })(),
        passing_score: parseOptionalNumber(formData.get('passing_score')) ?? 70,
        status: str(formData.get('status')) ?? 'draft',
        start_date: str(formData.get('start_date')),
        end_date: str(formData.get('end_date')),
      })
      .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/lms')
    revalidatePath(`/dashboard/lms/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el curso'
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Actions — Inscripciones
// ---------------------------------------------------------------------------

export async function enrollActorAction(
  actorId: string,
  courseId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await enrollInCourse(courseId, actorId)
    revalidatePath('/dashboard/lms')
    revalidatePath(`/dashboard/lms/${courseId}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al inscribir al actor'
    return { success: false, error: message }
  }
}

export async function updateProgressAction(
  enrollmentId: string,
  progress: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateEnrollmentProgress(enrollmentId, progress)
    revalidatePath('/dashboard/lms')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el progreso'
    return { success: false, error: message }
  }
}
