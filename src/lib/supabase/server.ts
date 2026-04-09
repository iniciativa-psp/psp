import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente Supabase para Server Components y Route Handlers de Next.js.
 * Lee y escribe cookies de sesión para el usuario autenticado.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll puede lanzar en Server Components de solo lectura;
            // puede ignorarse si no se necesita refrescar la sesión.
          }
        },
      },
    },
  )
}
