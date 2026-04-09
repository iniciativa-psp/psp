'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface ModuleCardProps {
  title: string
  href: string
  icon: LucideIcon
  color: string
  bg: string
  description: string
  stat?: number
  statLabel?: string
}

export function ModuleCard({
  title,
  href,
  icon: Icon,
  color,
  bg,
  description,
  stat,
  statLabel,
}: ModuleCardProps) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div
            className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-2`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          {stat !== undefined && (
            <p className="text-2xl font-bold leading-none">
              {new Intl.NumberFormat('es-PA').format(stat)}
              {statLabel && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {statLabel}
                </span>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
