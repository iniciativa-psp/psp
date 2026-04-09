import { TrendingUpIcon, UsersIcon, LeafIcon, WavesIcon, BuildingIcon, ShoppingBagIcon, PaletteIcon, RecycleIcon, SunIcon, HeartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EconomicSector } from '@/types'

interface SectorCardProps {
  sector: EconomicSector
  agentCount: number
}

const SECTOR_STYLES: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  agricultura:      { color: 'text-green-700',   bg: 'bg-green-50',   icon: LeafIcon },
  agroindustria:    { color: 'text-lime-700',     bg: 'bg-lime-50',    icon: LeafIcon },
  turismo:          { color: 'text-teal-700',     bg: 'bg-teal-50',    icon: WavesIcon },
  cultura:          { color: 'text-purple-700',   bg: 'bg-purple-50',  icon: PaletteIcon },
  artesanias:       { color: 'text-orange-700',   bg: 'bg-orange-50',  icon: PaletteIcon },
  medio_ambiente:   { color: 'text-emerald-700',  bg: 'bg-emerald-50', icon: LeafIcon },
  pesca_artesanal:  { color: 'text-blue-700',     bg: 'bg-blue-50',    icon: WavesIcon },
  hogares:          { color: 'text-pink-700',     bg: 'bg-pink-50',    icon: HeartIcon },
  aseo_reciclaje:   { color: 'text-yellow-700',   bg: 'bg-yellow-50',  icon: RecycleIcon },
  industria:        { color: 'text-slate-700',    bg: 'bg-slate-50',   icon: BuildingIcon },
  energia_limpia:   { color: 'text-amber-700',    bg: 'bg-amber-50',   icon: SunIcon },
  economia_cuidado: { color: 'text-rose-700',     bg: 'bg-rose-50',    icon: HeartIcon },
  economia_plateada:{ color: 'text-gray-700',     bg: 'bg-gray-50',    icon: UsersIcon },
  economia_circular:{ color: 'text-green-800',    bg: 'bg-green-100',  icon: RecycleIcon },
  bioeconomia:      { color: 'text-emerald-800',  bg: 'bg-emerald-100',icon: LeafIcon },
  empleos_verdes:   { color: 'text-teal-800',     bg: 'bg-teal-100',   icon: TrendingUpIcon },
  otros:            { color: 'text-gray-600',     bg: 'bg-gray-50',    icon: ShoppingBagIcon },
}

const DEFAULT_STYLE = { color: 'text-indigo-700', bg: 'bg-indigo-50', icon: TrendingUpIcon }

export function SectorCard({ sector, agentCount }: SectorCardProps) {
  const style = SECTOR_STYLES[sector.code] ?? DEFAULT_STYLE
  const Icon = style.icon

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${style.color}`} />
          </div>
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
            {sector.name_short ?? sector.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{agentCount}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {agentCount === 1 ? 'agente registrado' : 'agentes registrados'}
        </p>
        {sector.category && (
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.color}`}>
            {sector.category.replace(/_/g, ' ')}
          </span>
        )}
      </CardContent>
    </Card>
  )
}
