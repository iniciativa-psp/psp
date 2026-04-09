import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, AppRole } from '@/types'

/**
 * Obtiene la sesión actual del usuario desde el servidor.
 */
export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Obtiene el usuario autenticado actual desde el servidor.
 * Usa getUser() para validación segura contra el servidor de Supabase.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obtiene el perfil del usuario actual con su rol.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as Profile | null
}

/**
 * Requiere autenticación. Redirige a /login si no está autenticado.
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Requiere un rol mínimo. Redirige a /dashboard si el rol es insuficiente.
 */
export async function requireRole(requiredRole: AppRole) {
  const profile = await getProfile()
  if (!profile) {
    redirect('/login')
  }

  const hierarchy: Record<AppRole, number> = {
    superadmin: 6,
    admin: 5,
    gestor: 4,
    operador: 3,
    auditor: 2,
    viewer: 1,
  }

  if (hierarchy[profile.role] < hierarchy[requiredRole]) {
    redirect('/dashboard')
  }

  return profile
}

/**
 * Cierra la sesión del usuario (Server Action).
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
