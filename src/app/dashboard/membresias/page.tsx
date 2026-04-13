import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCardIcon, BuildingIcon } from 'lucide-react'
import { getActiveTenants } from '@/lib/membresias/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Membresías — SIG-PSP',
}

export default async function MembresiasPage() {
  const tenants = await getActiveTenants()

  // If there is exactly one active tenant, redirect automatically
  if (tenants.length === 1) {
    redirect(`/dashboard/${tenants[0].tenant_actor_id}/membresias`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Membresías</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona el tenant para gestionar sus membresías.
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-16">
          <CreditCardIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium text-lg">Sin tenants activos</p>
          <p className="text-sm text-muted-foreground mt-2">
            No perteneces a ningún tenant activo. Contacta a un administrador para obtener acceso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <Card key={tenant.tenant_actor_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BuildingIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  {tenant.actor_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/${tenant.tenant_actor_id}/membresias`}>
                  <Button className="w-full" variant="outline">
                    Ver membresías
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
