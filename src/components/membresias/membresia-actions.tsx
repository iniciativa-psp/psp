'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelSubscriptionAction, renewSubscriptionAction } from '@/lib/membresias/actions'

interface MembresiaActionsProps {
  id: string
  status: string
}

export function MembresiaActions({ id, status }: MembresiaActionsProps) {
  const router = useRouter()
  const [renewPending, startRenew] = useTransition()
  const [cancelPending, startCancel] = useTransition()

  const isActive = status === 'active'
  const isCancelled = status === 'cancelled'

  function handleRenew() {
    startRenew(async () => {
      await renewSubscriptionAction(id)
      router.refresh()
    })
  }

  function handleCancel() {
    if (!confirm('¿Confirmas la cancelación de esta suscripción?')) return
    startCancel(async () => {
      await cancelSubscriptionAction(id, 'Cancelado manualmente')
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      {!isCancelled && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRenew}
          disabled={renewPending || cancelPending}
        >
          {renewPending && <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />}
          Renovar
        </Button>
      )}
      {isActive && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleCancel}
          disabled={renewPending || cancelPending}
        >
          {cancelPending && <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />}
          Cancelar
        </Button>
      )}
    </div>
  )
}
