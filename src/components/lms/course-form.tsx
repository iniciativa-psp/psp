'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCourseAction, updateCourseAction } from '@/lib/lms/actions'
import type { Course } from '@/types'

const SELECT_CLS =
  'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const TEXTAREA_CLS =
  'w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none'

interface CourseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
}

export function CourseForm({ open, onOpenChange, course }: CourseFormProps) {
  const router = useRouter()
  const isEdit = !!course
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = isEdit
      ? await updateCourseAction(course!.id, formData)
      : await createCourseAction(formData)

    setPending(false)

    if (!result.success) {
      setError(result.error ?? 'Error desconocido')
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Editar curso' : 'Nuevo curso'}</SheetTitle>
        </SheetHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div className="space-y-1.5">
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              name="code"
              required
              defaultValue={course?.code ?? ''}
              placeholder="CURSO-001"
              disabled={isEdit}
            />
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre del curso *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={course?.name ?? ''}
              placeholder="Gestión de Microempresas"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              name="description"
              className={TEXTAREA_CLS}
              defaultValue={course?.description ?? ''}
              placeholder="Descripción breve del curso..."
              rows={3}
            />
          </div>

          {/* Categoría / Nivel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Nivel</Label>
              <select
                id="category"
                name="category"
                className={SELECT_CLS}
                defaultValue={course?.category ?? ''}
              >
                <option value="">Sin nivel</option>
                <option value="basico">Básico</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modality">Modalidad</Label>
              <select
                id="modality"
                name="modality"
                className={SELECT_CLS}
                defaultValue={course?.modality ?? 'virtual'}
              >
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
          </div>

          {/* Duración y participantes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duration_hours">Duración (horas)</Label>
              <Input
                id="duration_hours"
                name="duration_hours"
                type="number"
                min="0"
                step="0.5"
                defaultValue={course?.duration_hours ?? ''}
                placeholder="20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max_participants">Máx. participantes</Label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                min="1"
                defaultValue={course?.max_participants ?? ''}
                placeholder="30"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              className={SELECT_CLS}
              defaultValue={course?.status ?? 'draft'}
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha inicio</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={course?.start_date?.slice(0, 10) ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha fin</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={course?.end_date?.slice(0, 10) ?? ''}
              />
            </div>
          </div>

          {/* Nota de aprobación */}
          <div className="space-y-1.5">
            <Label htmlFor="passing_score">Nota de aprobación (%)</Label>
            <Input
              id="passing_score"
              name="passing_score"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={course?.passing_score ?? 70}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear curso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
