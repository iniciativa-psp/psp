import { createClient } from '@/lib/supabase/server'
import type {
  Payment,
  PaymentConcept,
  Beneficiary,
  PaymentStatus,
  PaymentSummary,
  PaymentTotalByConcept,
  PaginatedResponse,
} from '@/types'

// ---------------------------------------------------------------------------
// Conceptos de pago
// ---------------------------------------------------------------------------

/** Devuelve los conceptos de pago activos. */
export async function getPaymentConcepts(): Promise<PaymentConcept[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payment_concepts')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`getPaymentConcepts: ${error.message}`)
  return data ?? []
}

/** Devuelve un concepto por ID. */
export async function getPaymentConcept(
  id: string,
): Promise<PaymentConcept | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payment_concepts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getPaymentConcept: ${error.message}`)
  }
  return data
}

// ---------------------------------------------------------------------------
// Beneficiarios
// ---------------------------------------------------------------------------

/** Devuelve beneficiarios activos con búsqueda opcional. */
export async function getBeneficiaries(opts?: {
  search?: string
  territorialId?: number
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<Beneficiary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('beneficiaries')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .range(from, to)

  if (opts?.search) {
    query = query.or(
      `full_name.ilike.%${opts.search}%,id_number.ilike.%${opts.search}%,email.ilike.%${opts.search}%`,
    )
  }
  if (opts?.territorialId) {
    query = query.eq('territorial_id', opts.territorialId)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`getBeneficiaries: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un beneficiario por ID. */
export async function getBeneficiary(id: string): Promise<Beneficiary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beneficiaries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getBeneficiary: ${error.message}`)
  }
  return data
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

/** Devuelve pagos (vista de resumen) con filtros y paginación. */
export async function getPayments(opts?: {
  status?: PaymentStatus
  conceptId?: string
  beneficiaryId?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<PaymentSummary>> {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_payments_summary')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.conceptId) query = query.eq('concept_id', opts.conceptId)
  if (opts?.beneficiaryId) query = query.eq('beneficiary_id', opts.beneficiaryId)

  const { data, error, count } = await query
  if (error) throw new Error(`getPayments: ${error.message}`)

  const total = count ?? 0
  return {
    data: data ?? [],
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** Devuelve un pago por ID. */
export async function getPayment(id: string): Promise<Payment | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getPayment: ${error.message}`)
  }
  return data
}

/** Crea un nuevo pago. */
export async function createPayment(
  payload: Omit<Payment, 'id' | 'created_at' | 'updated_at'>,
): Promise<Payment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`createPayment: ${error.message}`)
  return data
}

/** Actualiza el estado de un pago. */
export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  notes?: string,
): Promise<Payment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .update({ status, notes })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updatePaymentStatus: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Estadísticas / totales
// ---------------------------------------------------------------------------

/** Devuelve totales agrupados por concepto de pago. */
export async function getPaymentTotals(
  status: PaymentStatus = 'completed',
  currency = 'USD',
): Promise<PaymentTotalByConcept[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_payment_totals_by_concept', {
    p_status: status,
    p_currency: currency,
  })

  if (error) throw new Error(`getPaymentTotals: ${error.message}`)
  return data ?? []
}
