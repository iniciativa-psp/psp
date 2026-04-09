import { createClient } from '@/lib/supabase/client'

/**
 * Obtiene el usuario autenticado en el cliente.
 */
export async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Inicia sesión con email y contraseña.
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Registra un nuevo usuario con email, contraseña y nombre completo.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = createClient()
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
}

/**
 * Cierra la sesión del usuario en el cliente.
 */
export async function signOut() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

/**
 * Envía un correo de recuperación de contraseña.
 */
export async function resetPassword(email: string) {
  const supabase = createClient()
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  })
}
