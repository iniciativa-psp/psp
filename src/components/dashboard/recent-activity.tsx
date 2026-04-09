import {
  UserPlusIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  HandshakeIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
} from 'lucide-react'
import type { ActivityItem, ActivityType } from '@/lib/dashboard/api'

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  actor_nuevo: UserPlusIcon,
  vacante_publicada: BriefcaseIcon,
  inscripcion: GraduationCapIcon,
  donacion: HeartHandshakeIcon,
  membresía: HandshakeIcon,
  voluntario: CalendarDaysIcon,
  oportunidad: CalendarDaysIcon,
  producto: ShoppingBagIcon,
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  actor_nuevo: 'bg-violet-100 text-violet-600',
  vacante_publicada: 'bg-emerald-100 text-emerald-600',
  inscripcion: 'bg-indigo-100 text-indigo-600',
  donacion: 'bg-pink-100 text-pink-600',
  membresía: 'bg-purple-100 text-purple-600',
  voluntario: 'bg-rose-100 text-rose-600',
  oportunidad: 'bg-amber-100 text-amber-600',
  producto: 'bg-red-100 text-red-600',
}

function relativeTime(dateStr: string): string {
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  const diff = (new Date(dateStr).getTime() - Date.now()) / 1000

  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2592000, 'week'],
    [31536000, 'month'],
  ]

  let divisor = 1
  let unit: Intl.RelativeTimeFormatUnit = 'second'

  for (const [limit, u] of thresholds) {
    if (Math.abs(diff) < limit) {
      unit = u
      break
    }
    divisor = limit
    unit = u
  }

  return rtf.format(Math.round(diff / divisor), unit)
}

interface RecentActivityProps {
  items: ActivityItem[]
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay actividad reciente.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type] ?? CalendarDaysIcon
        const colorClass = ACTIVITY_COLORS[item.type] ?? 'bg-gray-100 text-gray-600'

        return (
          <li key={item.id} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug line-clamp-2">
                {item.description}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {relativeTime(item.date)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
