'use client'

import { useState } from 'react'
import { PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActorForm } from '@/components/actores/actor-form'
import type { Actor } from '@/types'

interface ActorProfileClientProps {
  actor: Actor
  canSetStatus?: boolean
}

export function ActorProfileClient({ actor, canSetStatus = false }: ActorProfileClientProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <PencilIcon className="h-4 w-4" />
        Editar actor
      </Button>
      <ActorForm
        open={open}
        onOpenChange={setOpen}
        actor={actor}
        canSetStatus={canSetStatus}
      />
    </>
  )
}
