'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActoresTable } from '@/components/actores/actores-table'
import { ActorForm } from '@/components/actores/actor-form'
import type { ActorSummary } from '@/types'

interface ActoresListClientProps {
  actors: ActorSummary[]
  canCreate: boolean
  canSetStatus?: boolean
}

export function ActoresListClient({ actors, canCreate, canSetStatus = false }: ActoresListClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingActor, setEditingActor] = useState<ActorSummary | null>(null)

  function handleEdit(actor: ActorSummary) {
    setEditingActor(actor)
    setFormOpen(true)
  }

  function handleNew() {
    setEditingActor(null)
    setFormOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingActor(null)
  }

  return (
    <>
      {/* New Actor button — only rendered when canCreate */}
      {canCreate && (
        <div className="flex justify-end p-4 pb-0">
          <Button onClick={handleNew} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Nuevo actor
          </Button>
        </div>
      )}

      <ActoresTable actors={actors} onEdit={canCreate ? handleEdit : undefined} />

      <ActorForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        actor={editingActor}
        canSetStatus={canSetStatus}
      />
    </>
  )
}
