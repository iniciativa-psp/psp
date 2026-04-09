'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EstrategiaTable } from '@/components/estrategia/estrategia-table'
import { StrategyForm } from '@/components/estrategia/strategy-form'
import type { StrategySummary } from '@/types'

interface EstrategiaListClientProps {
  items: StrategySummary[]
  canCreate: boolean
  canSetStatus: boolean
}

export function EstrategiaListClient({ items, canCreate, canSetStatus }: EstrategiaListClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<StrategySummary | null>(null)

  function handleCreate() {
    setEditItem(null)
    setFormOpen(true)
  }

  function handleEdit(item: StrategySummary) {
    setEditItem(item)
    setFormOpen(true)
  }

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'ítem encontrado' : 'ítems encontrados'}
        </p>
        {canCreate && (
          <Button size="sm" onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Nueva entrada estratégica
          </Button>
        )}
      </div>

      <EstrategiaTable
        items={items}
        onEdit={canCreate ? handleEdit : undefined}
      />

      <StrategyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editItem}
        canSetStatus={canSetStatus}
      />
    </>
  )
}
