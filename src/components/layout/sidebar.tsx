'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  MapIcon,
  CreditCardIcon,
  UsersIcon,
  LogOutIcon,
  XIcon,
  Users2Icon,
  TargetIcon,
  BriefcaseIcon,
  LightbulbIcon,
  ShoppingBagIcon,
  HeartIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/client'
import { ROLE_LABELS } from '@/types'
import type { Profile, AppRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  minRole?: AppRole
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { label: 'Territorial', href: '/dashboard/territorial', icon: MapIcon },
  { label: 'Actores', href: '/dashboard/actores', icon: Users2Icon },
  { label: 'Estrategia', href: '/dashboard/estrategia', icon: TargetIcon },
  { label: 'Empleos', href: '/dashboard/empleos', icon: BriefcaseIcon },
  { label: 'Oportunidades', href: '/dashboard/oportunidades', icon: LightbulbIcon },
  { label: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBagIcon },
  { label: 'Donaciones', href: '/dashboard/donaciones', icon: HeartIcon },
  { label: 'Pagos', href: '/dashboard/pagos', icon: CreditCardIcon },
  { label: 'Usuarios', href: '/dashboard/usuarios', icon: UsersIcon, minRole: 'admin' },
]

interface SidebarProps {
  profile: Profile | null
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const roleHierarchy: Record<AppRole, number> = {
    superadmin: 6,
    admin: 5,
    gestor: 4,
    operador: 3,
    auditor: 2,
    viewer: 1,
  }

  const userRole = profile?.role ?? 'viewer'

  const visibleItems = navItems.filter(item => {
    if (!item.minRole) return true
    return roleHierarchy[userRole] >= roleHierarchy[item.minRole]
  })

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col h-full bg-[oklch(0.205_0.08_265)] text-[oklch(0.97_0_0)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[oklch(0.336_0.06_265)]">
        <div>
          <p className="font-bold text-lg leading-tight">SIG-PSP</p>
          <p className="text-xs text-[oklch(0.7_0_0)]">Panamá Sin Pobreza</p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[oklch(0.97_0_0)] hover:bg-[oklch(0.269_0.07_265)] md:hidden"
          >
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Cerrar menú</span>
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-xs font-semibold text-[oklch(0.6_0_0)] uppercase tracking-wider px-2 mb-2">
          Principal
        </p>
        {visibleItems.slice(0, 1).map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
        ))}

        <p className="text-xs font-semibold text-[oklch(0.6_0_0)] uppercase tracking-wider px-2 mt-4 mb-2">
          Gestión
        </p>
        {visibleItems.slice(1).filter(i => !i.minRole).map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
        ))}

        {visibleItems.some(i => i.minRole) && (
          <>
            <p className="text-xs font-semibold text-[oklch(0.6_0_0)] uppercase tracking-wider px-2 mt-4 mb-2">
              Sistema
            </p>
            {visibleItems.filter(i => i.minRole).map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[oklch(0.336_0.06_265)]">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[oklch(0.488_0.243_264.376)] text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || profile?.email || 'Usuario'}
            </p>
            <Badge
              variant="secondary"
              className="text-xs bg-[oklch(0.269_0.07_265)] text-[oklch(0.97_0_0)] hover:bg-[oklch(0.269_0.07_265)] border-0 mt-0.5"
            >
              {ROLE_LABELS[userRole]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[oklch(0.7_0_0)] hover:text-[oklch(0.97_0_0)] hover:bg-[oklch(0.269_0.07_265)]"
          onClick={handleSignOut}
        >
          <LogOutIcon className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem
  pathname: string
  onClose?: () => void
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[oklch(0.488_0.243_264.376)] text-white'
          : 'text-[oklch(0.8_0_0)] hover:bg-[oklch(0.269_0.07_265)] hover:text-[oklch(0.97_0_0)]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}
