import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para componentes del lado del cliente (React Client Components).
 * Usa las variables de entorno públicas NEXT_PUBLIC_*.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
