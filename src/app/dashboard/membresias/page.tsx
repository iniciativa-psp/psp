import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BuildingIcon } from 'lucide-react'

import { getActiveTenants } from '@/lib/membresias/api'
import { getProfile } from '@/lib/auth'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Membresías — Seleccionar organización — SIG-PSP',
}

export default async function MembresiasTenantPickerPage() {
  const [profile, tenants] = await Promise.all([getProfile(), getActiveTenants()])

  if (tenants.length === 1) {
    redirect(`/dashboard/${tenants[0].tenant_actor_id}/membresias`)
  }

  if (tenants.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Membresías</h1>
          <p className="text-muted-foreground mt-1">
            No perteneces a ninguna organización (tenant) activa.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sin organizaciones</CardTitle>
            <CardDescription>
              Solicita acceso a un administrador para que te agregue a un tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!profile ? (
              <p className="text-sm text-muted-foreground">Inicia sesión para ver tus organizaciones.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Usuario: <span className="font-medium">{profile.email ?? profile.id}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Membresías</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona una organización para gestionar sus membresías.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map(t => (
          <Card key={t.tenant_actor_id} className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BuildingIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                {t.actor_name ?? 'Organización sin nombre'}
              </CardTitle>
              <CardDescription className="text-xs">
                Tenant: <code>{t.tenant_actor_id}</code>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link href={`/dashboard/${t.tenant_actor_id}/membresias`}>
                <Button className="w-full" variant="outline">
                  Ver membresías
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
