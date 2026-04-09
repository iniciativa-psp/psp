import { createClient } from '@/lib/supabase/server'
import type {
  Donation,
  Sponsorship,
  FundraisingStats,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Donaciones
// ---------------------------------------------------------------------------

/** Devuelve donaciones con filtros y paginación opcionales. */
export async function getDonations(opts?: {
  status?: string
  donationType?: string
  donorActorId?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<Donation>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('donations')
    .select('*', { count: 'exact' })
    .order('donation_date', { ascending: false })
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.donationType) query = query.eq('donation_type', opts.donationType)
  if (opts?.donorActorId) query = query.eq('donor_actor_id', opts.donorActorId)

  const { data, error, count } = await query
  if (error) throw new Error(`getDonations: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Crea una nueva donación. */
export async function createDonation(
  payload: Omit<Donation, 'id' | 'created_at' | 'updated_at'>,
): Promise<Donation> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('donations')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createDonation: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Patrocinios
// ---------------------------------------------------------------------------

/** Devuelve patrocinios con filtros y paginación opcionales. */
export async function getSponsorships(opts?: {
  status?: string
  level?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<Sponsorship>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('sponsorships')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.level) query = query.eq('level', opts.level)

  const { data, error, count } = await query
  if (error) throw new Error(`getSponsorships: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Crea un nuevo patrocinio. */
export async function createSponsorship(
  payload: Omit<Sponsorship, 'id' | 'created_at' | 'updated_at'>,
): Promise<Sponsorship> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sponsorships')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createSponsorship: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Estadísticas de recaudación
// ---------------------------------------------------------------------------

/** Fila de donación parcial para cálculo de estadísticas */
type DonationStatsRow = { amount: number | null; donation_type: string }

/** Fila de patrocinio parcial para cálculo de estadísticas */
type SponsorshipStatsRow = { amount_annual: number | null; level: string }

/** Devuelve estadísticas y métricas del módulo de recaudación. */
export async function getFundraisingStats(): Promise<FundraisingStats> {
  const supabase = await createClient()

  const [donationsResult, sponsorshipsResult, topDonorsResult] = await Promise.all([
    supabase
      .from('donations')
      .select('amount, donation_type')
      .eq('status', 'confirmed'),
    supabase
      .from('sponsorships')
      .select('amount_annual, level')
      .eq('status', 'active'),
    supabase
      .from('donations')
      .select('donor_actor_id, amount')
      .eq('status', 'confirmed')
      .not('donor_actor_id', 'is', null)
      .order('amount', { ascending: false })
      .limit(10),
  ])

  if (donationsResult.error) throw new Error(`getFundraisingStats (donations): ${donationsResult.error.message}`)
  if (sponsorshipsResult.error) throw new Error(`getFundraisingStats (sponsorships): ${sponsorshipsResult.error.message}`)
  if (topDonorsResult.error) throw new Error(`getFundraisingStats (topDonors): ${topDonorsResult.error.message}`)

  const donations = (donationsResult.data ?? []) as DonationStatsRow[]
  const sponsorships = (sponsorshipsResult.data ?? []) as SponsorshipStatsRow[]
  const topDonors = topDonorsResult.data ?? []

  const totalDonations = donations.reduce(
    (acc: number, d: DonationStatsRow) => acc + (d.amount ?? 0),
    0,
  )
  const totalSponsorships = sponsorships.reduce(
    (acc: number, s: SponsorshipStatsRow) => acc + (s.amount_annual ?? 0),
    0,
  )

  const byType: Record<string, number> = {}
  for (const d of donations) {
    byType[d.donation_type] = (byType[d.donation_type] ?? 0) + (d.amount ?? 0)
  }

  return {
    total_donations: totalDonations,
    total_sponsorships: totalSponsorships,
    top_donors: topDonors,
    by_type: byType,
  }
}
