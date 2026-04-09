import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | string | undefined
  change?: number
  changeLabel?: string
  icon: LucideIcon
  color: string
  href?: string
  formatCurrency?: boolean
}

function formatValue(value: number | string, formatCurrency?: boolean): string {
  if (typeof value === 'string') return value
  if (formatCurrency) {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('es-PA').format(value)
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  href,
  formatCurrency,
}: KpiCardProps) {
  const content = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-24 mb-1" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">
            {formatValue(value, formatCurrency)}
          </div>
        )}
        {change !== undefined && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {change >= 0 ? (
              <ArrowUpIcon className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 text-red-500" />
            )}
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change >= 0 ? '+' : ''}
              {change}
            </span>
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </p>
        )}
        {change === undefined && changeLabel && (
          <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}
