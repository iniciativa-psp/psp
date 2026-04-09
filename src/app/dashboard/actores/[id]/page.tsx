import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, MailIcon, PhoneIcon, GlobeIcon, MapPinIcon, MessageCircleIcon } from 'lucide-react'
import { getActor, getActorRelationships } from '@/lib/actores/api'
import { getProfile } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ACTOR_TYPE_LABELS,
  ACTOR_STATUS_LABELS,
  EDUCATION_LEVEL_LABELS,
  ECONOMIC_AGENT_LABELS,
  VULNERABLE_GROUP_LABELS,
  STRATEGIC_SECTOR_LABELS_FULL,
  ROLE_HIERARCHY,
} from '@/types'
import type { ActorType, ActorStatus } from '@/types'
import { ActorProfileClient } from '@/components/actores/actor-profile-client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const actor = await getActor(id)
  return {
    title: actor ? `${actor.full_name} — Actores SIG-PSP` : 'Actor no encontrado',
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const AVATAR_BG: Record<ActorType, string> = {
  persona_natural: 'bg-blue-500',
  hogar: 'bg-green-500',
  empresa: 'bg-purple-500',
  cooperativa: 'bg-yellow-500',
  ong: 'bg-pink-500',
  institucion_publica: 'bg-indigo-500',
  agrupacion: 'bg-orange-500',
  organismo_internacional: 'bg-cyan-500',
  medio_comunicacion: 'bg-rose-500',
}

const TYPE_COLORS: Record<ActorType, string> = {
  persona_natural: 'bg-blue-100 text-blue-800 border-blue-200',
  hogar: 'bg-green-100 text-green-800 border-green-200',
  empresa: 'bg-purple-100 text-purple-800 border-purple-200',
  cooperativa: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ong: 'bg-pink-100 text-pink-800 border-pink-200',
  institucion_publica: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  agrupacion: 'bg-orange-100 text-orange-800 border-orange-200',
  organismo_internacional: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  medio_comunicacion: 'bg-rose-100 text-rose-800 border-rose-200',
}

const STATUS_COLORS: Record<ActorStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending_verification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function buildWhatsAppLink(whatsapp: string | null): string | null {
  if (!whatsapp) return null
  const digits = whatsapp.replace(/\D/g, '')
  if (whatsapp.startsWith('+507') || digits.length === 8) {
    return `https://wa.me/507${digits.slice(-8)}`
  }
  if (whatsapp.startsWith('+') && digits.length > 8) {
    return `https://wa.me/${digits}`
  }
  return null
}

function formatUSD(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(value)
}

// ---------------------------------------------------------------------------
// Score bar component
// ---------------------------------------------------------------------------

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ActorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [actor, relationships, profile] = await Promise.all([
    getActor(id),
    getActorRelationships(id),
    getProfile(),
  ])

  if (!actor) notFound()

  // TypeScript narrowing after notFound()
  const a = actor as NonNullable<typeof actor>

  const canEdit = profile
    ? ROLE_HIERARCHY[profile.role] >= ROLE_HIERARCHY['operador']
    : false

  const canSetStatus = profile
    ? ROLE_HIERARCHY[profile.role] >= ROLE_HIERARCHY['gestor']
    : false

  const waLink = buildWhatsAppLink(a.whatsapp)
  const isPersonOrHogar = a.actor_type === 'persona_natural' || a.actor_type === 'hogar'

  return (
    <div className="space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/actores">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a la lista
          </Link>
        </Button>
        {canEdit && (
          <ActorProfileClient actor={a} canSetStatus={canSetStatus} />
        )}
      </div>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarFallback className={`${AVATAR_BG[a.actor_type]} text-white text-2xl font-bold`}>
                {getInitials(a.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{a.full_name}</h1>
              {a.legal_name && (
                <p className="text-muted-foreground text-sm mt-0.5">{a.legal_name}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={`border ${TYPE_COLORS[a.actor_type]}`} variant="outline">
                  {ACTOR_TYPE_LABELS[a.actor_type]}
                </Badge>
                <Badge className={`border ${STATUS_COLORS[a.status]}`} variant="outline">
                  {ACTOR_STATUS_LABELS[a.status]}
                </Badge>
                {a.id_number && (
                  <span className="text-xs text-muted-foreground">Cédula: {a.id_number}</span>
                )}
                {a.ruc && (
                  <span className="text-xs text-muted-foreground">RUC: {a.ruc}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacto y territoriales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto y ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.email && (
              <div className="flex items-center gap-3">
                <MailIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${a.email}`} className="text-sm text-blue-600 hover:underline">
                  {a.email}
                </a>
              </div>
            )}
            {a.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{a.phone}</span>
              </div>
            )}
            {waLink && (
              <div className="flex items-center gap-3">
                <MessageCircleIcon className="h-4 w-4 text-green-600 shrink-0" />
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                >
                  WhatsApp: {a.whatsapp}
                </a>
              </div>
            )}
            {a.website && (
              <div className="flex items-center gap-3">
                <GlobeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={a.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  {a.website}
                </a>
              </div>
            )}
            {a.address && (
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm">{a.address}</span>
              </div>
            )}
            {!a.email && !a.phone && !waLink && !a.website && !a.address && (
              <p className="text-sm text-muted-foreground">Sin información de contacto registrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Datos socioeconómicos (solo persona_natural/hogar) */}
        {isPersonOrHogar && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos socioeconómicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ingresos mensuales</span>
                <span className="text-sm font-medium">{formatUSD(a.income_monthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dependientes</span>
                <span className="text-sm font-medium">{a.dependents ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nivel educativo</span>
                <span className="text-sm font-medium">
                  {a.education_level
                    ? (EDUCATION_LEVEL_LABELS[a.education_level] ?? a.education_level)
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clasificación estratégica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clasificación estratégica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Grupos vulnerables
              </p>
              {a.vulnerable_groups?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {a.vulnerable_groups.map(g => (
                    <Badge key={g} variant="secondary" className="text-xs">
                      {VULNERABLE_GROUP_LABELS[g as keyof typeof VULNERABLE_GROUP_LABELS] ?? g}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Sectores estratégicos
              </p>
              {a.strategic_sectors?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {a.strategic_sectors.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {STRATEGIC_SECTOR_LABELS_FULL[s as keyof typeof STRATEGIC_SECTOR_LABELS_FULL] ?? s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Agentes económicos
              </p>
              {a.economic_agents?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {a.economic_agents.map(agent => (
                    <Badge key={agent} variant="secondary" className="text-xs">
                      {ECONOMIC_AGENT_LABELS[agent as keyof typeof ECONOMIC_AGENT_LABELS] ?? agent}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Puntuaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Puntuaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">Social Score</span>
                <span className="text-xs text-muted-foreground">0–100</span>
              </div>
              {a.social_score !== null ? (
                <ScoreBar value={a.social_score} color="bg-blue-500" />
              ) : (
                <p className="text-sm text-muted-foreground">No calculado</p>
              )}
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span className="text-xs text-muted-foreground">0–100</span>
              </div>
              {a.risk_score !== null ? (
                <ScoreBar
                  value={a.risk_score}
                  color={
                    a.risk_score > 70
                      ? 'bg-red-500'
                      : a.risk_score > 40
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">No calculado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relaciones del actor</CardTitle>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Este actor no tiene relaciones registradas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relationships.map(rel => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {rel.relationship_type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {rel.parent_actor_id === id ? `→ ${rel.child_actor_id}` : `← ${rel.parent_actor_id}`}
                    </span>
                  </div>
                  {rel.position && (
                    <span className="text-xs text-muted-foreground">{rel.position}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {a.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
