'use client'

import { useState } from 'react'
import { PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StrategyForm } from '@/components/estrategia/strategy-form'
import type { StrategySummary } from '@/types'

interface EstrategiaDetailClientProps {
  item: StrategySummary
}

export function EstrategiaDetailClient({ item }: EstrategiaDetailClientProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
        <PencilIcon className="h-4 w-4 mr-1.5" />
        Editar
      </Button>

      <StrategyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={item}
        canSetStatus
      />
    </>
  )
}
