/**
 * Tipos generados manualmente a partir del esquema de Supabase.
 * Para regenerar automáticamente: npm run db:generate-types
 */

// ---------------------------------------------------------------------------
// Módulo Territorial
// ---------------------------------------------------------------------------

export type TerritorialType = 'province' | 'district' | 'corregimiento' | 'community'

export interface TerritorialItem {
  id: number
  name: string
  slug: string
  code: string
  type: TerritorialType
  parent_id: number | null
  level: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TerritorialItemView {
  id: number
  name: string
  slug: string
  code: string
  is_active: boolean
}

export interface DistrictView extends TerritorialItemView {
  province_id: number
  province_name: string
}

export interface CorregimientoView extends TerritorialItemView {
  district_id: number
  district_name: string
  province_id: number
  province_name: string
}

// ---------------------------------------------------------------------------
// Módulo Pagos
// ---------------------------------------------------------------------------

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'

export interface PaymentConcept {
  id: string
  name: string
  description: string | null
  amount: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Beneficiary {
  id: string
  full_name: string
  id_number: string | null
  email: string | null
  phone: string | null
  territorial_id: number | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  concept_id: string
  beneficiary_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  payment_date: string | null
  reference_code: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PaymentStatusLog {
  id: number
  payment_id: string
  old_status: PaymentStatus | null
  new_status: PaymentStatus
  changed_by: string | null
  notes: string | null
  changed_at: string
}

export interface PaymentSummary {
  id: string
  reference_code: string | null
  status: PaymentStatus
  amount: number
  currency: string
  payment_date: string | null
  concept_name: string | null
  beneficiary_name: string | null
  beneficiary_id_number: string | null
  territorial_name: string | null
  territorial_type: TerritorialType | null
  created_at: string
}

export interface PaymentTotalByConcept {
  concept_id: string
  concept_name: string
  total_amount: number
  payment_count: number
}

// ---------------------------------------------------------------------------
// Respuesta de API paginada
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Auth & Roles
// ---------------------------------------------------------------------------

export type AppRole = 'superadmin' | 'admin' | 'gestor' | 'operador' | 'auditor' | 'viewer'

export type ProfileStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  role: AppRole
  status: ProfileStatus
  territorial_id: number | null
  created_at: string
  updated_at: string
}

export interface RoleChangeLog {
  id: number
  user_id: string
  old_role: AppRole | null
  new_role: AppRole
  changed_by: string | null
  reason: string | null
  changed_at: string
}

// Role hierarchy for client-side checks
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  superadmin: 6,
  admin: 5,
  gestor: 4,
  operador: 3,
  auditor: 2,
  viewer: 1,
}

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  gestor: 'Gestor',
  operador: 'Operador',
  auditor: 'Auditor',
  viewer: 'Visor',
}

// ---------------------------------------------------------------------------
// Módulo Territorial – Expansión (Fase 1)
// ---------------------------------------------------------------------------

export type TerritorialTypeExpanded =
  | 'country'
  | 'province'
  | 'district'
  | 'corregimiento'
  | 'community'
  | 'barrio'

export type UrbanRuralType = 'urban' | 'rural' | 'mixed'

export interface CommunityView {
  id: number
  name: string
  slug: string
  code: string
  urban_rural: UrbanRuralType | null
  population: number | null
  area_km2: number | null
  latitude: number | null
  longitude: number | null
  corregimiento_id: number
  corregimiento_name: string
  district_id: number
  district_name: string
  province_id: number
  province_name: string
  is_active: boolean
}

export interface TerritorialPath {
  id: number
  name: string
  type: TerritorialTypeExpanded
  level: number
  parent_id: number | null
}

// ---------------------------------------------------------------------------
// Módulo Actores / CRM (Fase 1)
// ---------------------------------------------------------------------------

export type ActorType =
  | 'persona_natural'
  | 'hogar'
  | 'empresa'
  | 'cooperativa'
  | 'ong'
  | 'institucion_publica'
  | 'agrupacion'
  | 'organismo_internacional'
  | 'medio_comunicacion'

export type ActorStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_verification'

export type VulnerableGroup =
  | 'ninez'
  | 'adolescencia'
  | 'adulto_mayor'
  | 'discapacidad'
  | 'indigena'
  | 'afrodescendiente'
  | 'migrante'
  | 'refugiado'
  | 'mujer_cabeza_hogar'
  | 'victima_violencia'

export type StrategicSector =
  | 'agricultura'
  | 'pesca'
  | 'construccion'
  | 'comercio'
  | 'transporte'
  | 'educacion'
  | 'salud'
  | 'turismo'
  | 'tecnologia'
  | 'finanzas'
  | 'energia'
  | 'mineria'
  | 'manufactura'
  | 'servicios'

export type EconomicAgent =
  | 'productor'
  | 'comercializador'
  | 'consumidor'
  | 'proveedor'
  | 'financiador'
  | 'regulador'
  | 'facilitador'
  | 'beneficiario'

export interface Actor {
  id: string
  actor_type: ActorType
  full_name: string
  legal_name: string | null
  id_number: string | null
  ruc: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  territorial_id: number | null
  address: string | null
  latitude: number | null
  longitude: number | null
  income_monthly: number | null
  dependents: number | null
  education_level: string | null
  vulnerable_groups: string[] | null
  strategic_sectors: string[] | null
  economic_agents: string[] | null
  social_score: number | null
  risk_score: number | null
  logo_url: string | null
  avatar_url: string | null
  status: ActorStatus
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActorRelationship {
  id: string
  parent_actor_id: string
  child_actor_id: string
  relationship_type: string
  position: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ActorSummary extends Actor {
  territorial_name: string | null
  territorial_type: string | null
}

// ---------------------------------------------------------------------------
// Módulo Estrategia (Fase 1)
// ---------------------------------------------------------------------------

export type StrategyLevel = 'plan' | 'programa' | 'proyecto' | 'actividad'

export type StrategyStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled'

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

export interface StrategyItem {
  id: string
  parent_id: string | null
  level: StrategyLevel
  code: string
  name: string
  description: string | null
  objective: string | null
  status: StrategyStatus
  responsible_id: string | null
  team_ids: string[]
  start_date: string | null
  end_date: string | null
  budget_planned: number | null
  budget_executed: number | null
  currency: string
  kpi_target: number | null
  kpi_current: number | null
  kpi_unit: string | null
  ods_goals: number[] | null
  territorial_id: number | null
  risk_probability: RiskLevel | null
  risk_impact: RiskLevel | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface StrategySummary extends StrategyItem {
  responsible_name: string | null
  territorial_name: string | null
  budget_pct: number
  kpi_pct: number
}

export interface StrategyTreeNode {
  id: string
  parent_id: string | null
  level: StrategyLevel
  code: string
  name: string
  status: StrategyStatus
  depth: number
}

export interface StrategyBudgetSummary {
  id: string
  level: StrategyLevel
  code: string
  name: string
  budget_planned: number
  budget_executed: number
  budget_pct: number
}

// ---------------------------------------------------------------------------
// Constantes de etiquetas
// ---------------------------------------------------------------------------

export const STRATEGY_LEVEL_LABELS: Record<StrategyLevel, string> = {
  plan: 'Plan',
  programa: 'Programa',
  proyecto: 'Proyecto',
  actividad: 'Actividad',
}

export const STRATEGY_STATUS_LABELS: Record<StrategyStatus, string> = {
  draft: 'Borrador',
  review: 'En Revisión',
  approved: 'Aprobado',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  persona_natural: 'Persona Natural',
  hogar: 'Hogar',
  empresa: 'Empresa',
  cooperativa: 'Cooperativa',
  ong: 'ONG',
  institucion_publica: 'Institución Pública',
  agrupacion: 'Agrupación',
  organismo_internacional: 'Organismo Internacional',
  medio_comunicacion: 'Medio de Comunicación',
}

export const ACTOR_STATUS_LABELS: Record<ActorStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  pending_verification: 'Pendiente de Verificación',
}

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  ninguna: 'Sin educación formal',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  tecnico: 'Técnico/Vocacional',
  universitaria: 'Universitaria',
  postgrado: 'Postgrado',
}

export const STRATEGIC_SECTOR_LABELS_FULL: Record<StrategicSector, string> = {
  agricultura: 'Agricultura',
  pesca: 'Pesca',
  construccion: 'Construcción',
  comercio: 'Comercio',
  transporte: 'Transporte',
  educacion: 'Educación',
  salud: 'Salud',
  turismo: 'Turismo',
  tecnologia: 'Tecnología',
  finanzas: 'Finanzas',
  energia: 'Energía',
  mineria: 'Minería',
  manufactura: 'Manufactura',
  servicios: 'Servicios',
}

export const ECONOMIC_AGENT_LABELS: Record<EconomicAgent, string> = {
  productor: 'Productor',
  comercializador: 'Comercializador',
  consumidor: 'Consumidor',
  proveedor: 'Proveedor',
  financiador: 'Financiador',
  regulador: 'Regulador',
  facilitador: 'Facilitador',
  beneficiario: 'Beneficiario',
}

export const VULNERABLE_GROUP_LABELS: Record<VulnerableGroup, string> = {
  ninez: 'Niñez',
  adolescencia: 'Adolescencia',
  adulto_mayor: 'Adulto Mayor',
  discapacidad: 'Discapacidad',
  indigena: 'Indígena',
  afrodescendiente: 'Afrodescendiente',
  migrante: 'Migrante',
  refugiado: 'Refugiado',
  mujer_cabeza_hogar: 'Mujer Cabeza de Hogar',
  victima_violencia: 'Víctima de Violencia',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  very_low: 'Muy Bajo',
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  very_high: 'Muy Alto',
}

export const ODS_LABELS: Record<number, string> = {
  1: 'Fin de la Pobreza',
  2: 'Hambre Cero',
  3: 'Salud y Bienestar',
  4: 'Educación de Calidad',
  5: 'Igualdad de Género',
  6: 'Agua Limpia y Saneamiento',
  7: 'Energía Asequible',
  8: 'Trabajo Decente y Crecimiento',
  9: 'Industria, Innovación e Infraestructura',
  10: 'Reducción de Desigualdades',
  11: 'Ciudades Sostenibles',
  12: 'Producción Responsable',
  13: 'Acción por el Clima',
  14: 'Vida Submarina',
  15: 'Vida de Ecosistemas Terrestres',
  16: 'Paz, Justicia e Instituciones',
  17: 'Alianzas para los Objetivos',
}

export const ODS_COLORS: Record<number, string> = {
  1: '#E5243B',
  2: '#DDA63A',
  3: '#4C9F38',
  4: '#C5192D',
  5: '#FF3A21',
  6: '#26BDE2',
  7: '#FCC30B',
  8: '#A21942',
  9: '#FD6925',
  10: '#DD1367',
  11: '#FD9D24',
  12: '#BF8B2E',
  13: '#3F7E44',
  14: '#0A97D9',
  15: '#56C02B',
  16: '#00689D',
  17: '#19486A',
}

// ---------------------------------------------------------------------------
// Módulo Empleos (Fase 2)
// ---------------------------------------------------------------------------

export type EmploymentType =
  | 'formal_dependiente'
  | 'formal_independiente'
  | 'emprendimiento'
  | 'cooperativo'
  | 'pasantia'
  | 'voluntariado'
  | 'temporal'
  | 'medio_tiempo'

export type EmploymentStatus = 'open' | 'filled' | 'in_progress' | 'completed' | 'cancelled'

export type EmploymentSector =
  | 'agricultura'
  | 'comercio'
  | 'servicios'
  | 'industria'
  | 'tecnologia'
  | 'turismo'
  | 'construccion'
  | 'pesca'
  | 'artesania'
  | 'logistica'
  | 'educacion'
  | 'salud'
  | 'otro'

export interface JobPosition {
  id: string
  strategy_id: string | null
  employer_actor_id: string | null
  title: string
  description: string | null
  employment_type: EmploymentType
  sector: EmploymentSector
  territorial_id: number | null
  positions_available: number
  positions_filled: number
  salary_min: number | null
  salary_max: number | null
  currency: string
  requirements: string | null
  benefits: string | null
  is_youth_priority: boolean
  is_female_priority: boolean
  is_agricultural: boolean
  status: EmploymentStatus
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface JobPositionSummary extends JobPosition {
  employer_name: string | null
  territorial_name: string | null
  application_count: number
}

export interface JobApplication {
  id: string
  job_position_id: string
  applicant_actor_id: string
  cover_letter: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmploymentRecord {
  id: string
  job_position_id: string | null
  employee_actor_id: string
  employer_actor_id: string | null
  employment_type: EmploymentType
  sector: EmploymentSector
  title: string | null
  salary: number | null
  currency: string
  start_date: string
  end_date: string | null
  territorial_id: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EmploymentDashboardStats {
  total_positions: number
  positions_open: number
  total_vacancies: number
  total_filled: number
  total_applications: number
  total_employment_records: number
  by_sector: Array<{ sector: EmploymentSector; count: number; vacancies: number; filled: number }>
  by_type: Array<{ employment_type: EmploymentType; count: number }>
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  formal_dependiente: 'Formal Dependiente',
  formal_independiente: 'Formal Independiente',
  emprendimiento: 'Emprendimiento',
  cooperativo: 'Cooperativo',
  pasantia: 'Pasantía',
  voluntariado: 'Voluntariado',
  temporal: 'Temporal',
  medio_tiempo: 'Medio Tiempo',
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  open: 'Abierta',
  filled: 'Cubierta',
  in_progress: 'En Proceso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const EMPLOYMENT_SECTOR_LABELS: Record<EmploymentSector, string> = {
  agricultura: 'Agricultura',
  comercio: 'Comercio',
  servicios: 'Servicios',
  industria: 'Industria',
  tecnologia: 'Tecnología',
  turismo: 'Turismo',
  construccion: 'Construcción',
  pesca: 'Pesca',
  artesania: 'Artesanía',
  logistica: 'Logística',
  educacion: 'Educación',
  salud: 'Salud',
  otro: 'Otro',
}

// ---------------------------------------------------------------------------
// Módulo Oportunidades (Fase 2)
// ---------------------------------------------------------------------------

export type OpportunityType =
  | 'capacitacion'
  | 'financiamiento'
  | 'mercado'
  | 'infraestructura'
  | 'asistencia_tecnica'
  | 'alianza'
  | 'investigacion'
  | 'donacion'

export type OpportunityStatus =
  | 'draft'
  | 'published'
  | 'active'
  | 'closed'
  | 'completed'
  | 'cancelled'

export interface Opportunity {
  id: string
  strategy_id: string | null
  title: string
  description: string | null
  opportunity_type: OpportunityType
  status: OpportunityStatus
  provider_actor_id: string | null
  territorial_id: number | null
  target_sectors: string[] | null
  target_actor_types: string[] | null
  budget_available: number | null
  currency: string
  beneficiaries_target: number | null
  beneficiaries_current: number
  start_date: string | null
  end_date: string | null
  application_deadline: string | null
  requirements: string | null
  contact_info: string | null
  external_url: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OpportunitySummary extends Opportunity {
  provider_name: string | null
  territorial_name: string | null
  application_count: number
}

export interface OpportunityApplication {
  id: string
  opportunity_id: string
  applicant_actor_id: string
  status: string
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface OpportunityStats {
  total: number
  by_type: Array<{ opportunity_type: OpportunityType; count: number }>
  by_status: Array<{ status: OpportunityStatus; count: number }>
  total_budget: number
  total_applications: number
  total_beneficiaries_target: number
  total_beneficiaries_current: number
}

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  capacitacion: 'Capacitación',
  financiamiento: 'Financiamiento',
  mercado: 'Mercado',
  infraestructura: 'Infraestructura',
  asistencia_tecnica: 'Asistencia Técnica',
  alianza: 'Alianza',
  investigacion: 'Investigación',
  donacion: 'Donación',
}

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  active: 'Activa',
  closed: 'Cerrada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

// ---------------------------------------------------------------------------
// Módulo Marketplace
// ---------------------------------------------------------------------------

export type MarketplaceProductType = 'product' | 'service' | 'digital' | 'agricultural' | 'artisanal'
export type MarketplaceProductStatus = 'draft' | 'active' | 'paused' | 'out_of_stock' | 'archived'
export type MarketplaceOrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type MarketplacePaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type MarketplaceDeliveryType = 'delivery' | 'pickup'

export interface MarketplaceCategory {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MarketplaceProduct {
  id: string
  seller_id: string
  category_id: string | null
  strategy_item_id: string | null
  territorial_id: number | null
  economic_sector_id: number | null
  sku: string | null
  name: string
  slug: string
  short_description: string | null
  description: string | null
  product_type: MarketplaceProductType
  price: number
  price_compare: number | null
  currency: string
  unit: string | null
  min_order_qty: number
  itbms_applies: boolean
  itbms_rate: number
  stock_qty: number
  stock_unlimited: boolean
  low_stock_threshold: number
  main_image_url: string | null
  images: string[]
  video_url: string | null
  delivery_available: boolean
  delivery_days_min: number
  delivery_days_max: number
  pickup_available: boolean
  weight_kg: number | null
  dimensions_cm: string | null
  status: MarketplaceProductStatus
  tags: string[]
  featured: boolean
  featured_until: string | null
  views_count: number
  orders_count: number
  rating_avg: number
  rating_count: number
  sponsor_actor_id: string | null
  sponsor_display_size: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketplaceProductSummary extends MarketplaceProduct {
  seller_name: string
  seller_logo_url: string | null
  category_name: string | null
  territorial_name: string | null
  sector_name: string | null
  price_with_itbms: number
  sponsor_name: string | null
}

export interface MarketplaceOrder {
  id: string
  order_number: string
  buyer_id: string
  strategy_item_id: string | null
  territorial_id: number | null
  status: MarketplaceOrderStatus
  subtotal: number
  discount_amount: number
  itbms_amount: number
  delivery_fee: number
  total: number
  currency: string
  delivery_type: MarketplaceDeliveryType
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_notes: string | null
  estimated_delivery_date: string | null
  delivered_at: string | null
  payment_status: MarketplacePaymentStatus
  payment_method: string | null
  payment_reference: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketplaceOrderSummary extends MarketplaceOrder {
  buyer_name: string
  territorial_name: string | null
  item_count: number
}

export interface MarketplaceOrderItem {
  id: string
  order_id: string
  product_id: string
  seller_id: string
  quantity: number
  unit_price: number
  itbms_rate: number
  itbms_amount: number
  line_total: number
  product_snapshot: Record<string, unknown> | null
  status: string
  notes: string | null
  created_at: string
}

export interface MarketplaceReview {
  id: string
  product_id: string
  reviewer_id: string
  order_item_id: string | null
  rating: number
  title: string | null
  body: string | null
  is_verified_purchase: boolean
  is_approved: boolean
  created_at: string
}

export interface MarketplaceCartItem {
  id: string
  actor_id: string
  product_id: string
  quantity: number
  added_at: string
  updated_at: string
}

export const MARKETPLACE_PRODUCT_TYPE_LABELS: Record<MarketplaceProductType, string> = {
  product: 'Producto',
  service: 'Servicio',
  digital: 'Digital',
  agricultural: 'Agrícola',
  artisanal: 'Artesanal',
}

export const MARKETPLACE_PRODUCT_STATUS_LABELS: Record<MarketplaceProductStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
  out_of_stock: 'Sin Stock',
  archived: 'Archivado',
}

export const MARKETPLACE_ORDER_STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En Proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

// ---------------------------------------------------------------------------
// Módulo Membresías
// ---------------------------------------------------------------------------

export type MembershipStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired'

export interface MembershipPlan {
  id: string
  code: string
  name: string
  description: string | null
  actor_type_allowed: string[] | null
  price_monthly: number
  price_quarterly: number | null
  price_semiannual: number | null
  price_annual: number | null
  currency: string
  trial_days: number
  features: Record<string, unknown>[]
  max_transactions: number | null
  max_users: number | null
  is_private: boolean
  sort_order: number
  status: string
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  actor_id: string
  plan_id: string
  status: MembershipStatus
  start_at: string
  end_at: string | null
  renew_at: string | null
  grace_period_days: number
  auto_renew: boolean
  cancel_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  suspended_at: string | null
  suspended_reason: string | null
  suspended_by: string | null
  amount_paid: number | null
  payment_method: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MembershipSummary {
  id: string
  actor_id: string
  actor_full_name: string
  actor_type: string
  plan_id: string
  plan_code: string
  plan_name: string
  price_monthly: number
  status: MembershipStatus
  start_at: string
  end_at: string | null
  renew_at: string | null
  grace_period_days: number
  auto_renew: boolean
  amount_paid: number | null
  payment_method: string | null
  cancel_reason: string | null
  cancelled_at: string | null
  suspended_at: string | null
  days_remaining: number | null
  is_expiring_soon: boolean
  territorial_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MembershipInvoice {
  id: string
  membership_id: string
  invoice_number: string
  amount: number
  itbms: number
  total: number
  currency: string
  status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  due_date: string | null
  paid_at: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
}

export interface MembershipMetrics {
  activas: number
  por_vencer_7_dias: number
  vencidas: number
  en_mora: number
  mrr: number
}

export interface MembresiaStats {
  total_active: number
  total_revenue_month: number
  total_revenue_year: number
  by_plan: Record<string, number>
  renewal_rate: number
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  past_due: 'En mora',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
  expired: 'Vencido',
}

// ---------------------------------------------------------------------------
// Módulo RRHH
// ---------------------------------------------------------------------------

export interface Employee {
  id: string
  actor_id: string | null
  profile_id: string | null
  employee_code: string
  position: string
  department: string | null
  hire_date: string
  contract_type: string | null
  salary: number | null
  salary_currency: string
  territorial_id: number | null
  manager_id: string | null
  status: string
  end_date: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PerformanceEvaluation {
  id: string
  employee_id: string
  evaluator_id: string | null
  period_year: number
  period_quarter: number | null
  institutional_score: number | null
  area_score: number | null
  individual_score: number | null
  impact_factor: number
  final_score: number | null
  comments: string | null
  status: string
  evaluated_at: string | null
  created_at: string
}

export interface HRStats {
  total_active: number
  by_department: Record<string, number>
  by_contract_type: Record<string, number>
}

// ---------------------------------------------------------------------------
// Módulo Voluntariado
// ---------------------------------------------------------------------------

export interface VolunteerOpportunity {
  id: string
  strategy_id: string | null
  title: string
  description: string | null
  sector: string | null
  territorial_id: number | null
  slots_available: number
  slots_filled: number
  skills_required: string | null
  hours_per_week: number | null
  is_remote: boolean
  start_date: string | null
  end_date: string | null
  status: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VolunteerRegistration {
  id: string
  opportunity_id: string
  actor_id: string
  status: string
  hours_logged: number
  certificate_code: string | null
  certificate_issued_at: string | null
  impact_notes: string | null
  created_at: string
  updated_at: string
}

export interface VolunteerSession {
  id: string
  registration_id: string
  session_date: string
  hours: number
  territorial_id: number | null
  activity_description: string | null
  evidence_url: string | null
  verified_by: string | null
  created_at: string
}

export interface VolunteerStats {
  total_volunteers: number
  total_hours: number
  total_sessions: number
  active_opportunities: number
  pending_applications: number
  by_sector: Record<string, number>
}

// ---------------------------------------------------------------------------
// Módulo LMS (Formación)
// ---------------------------------------------------------------------------

export interface Course {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  modality: string
  duration_hours: number | null
  max_participants: number | null
  strategy_id: string | null
  territorial_id: number | null
  instructor_actor_id: string | null
  certificate_template: string | null
  requires_evaluation: boolean
  passing_score: number
  status: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CourseEnrollment {
  id: string
  course_id: string
  actor_id: string
  enrolled_at: string | null
  completion_pct: number
  final_score: number | null
  passed: boolean
  certificate_code: string | null
  certificate_issued_at: string | null
  certificate_url: string | null
  status: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface LMSStats {
  total_courses: number
  total_enrollments: number
  completion_rate: number
  avg_score: number
  active_learners: number
}

// ---------------------------------------------------------------------------
// Módulo Donaciones y Patrocinios
// ---------------------------------------------------------------------------

export interface Donation {
  id: string
  donor_actor_id: string | null
  strategy_id: string | null
  territorial_id: number | null
  donation_type: string
  amount: number | null
  currency: string
  description: string | null
  is_recurring: boolean
  recurrence_period: string | null
  certificate_code: string | null
  certificate_issued_at: string | null
  receipt_url: string | null
  status: string
  donation_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Sponsorship {
  id: string
  sponsor_actor_id: string
  strategy_id: string | null
  territorial_id: number | null
  level: string
  amount_annual: number
  currency: string
  logo_url: string | null
  visibility_config: Record<string, unknown>
  branding_rights: string | null
  start_date: string
  end_date: string | null
  status: string
  contract_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FundraisingStats {
  total_donations: number
  total_sponsorships: number
  top_donors: Array<{ donor_actor_id: string | null; amount: number | null }>
  by_type: Record<string, number>
}

// ---------------------------------------------------------------------------
// Módulo Desarrollo Económico
// ---------------------------------------------------------------------------

export interface EconomicSector {
  id: number
  code: string
  name: string
  name_short: string | null
  description: string | null
  category: string | null
  icon: string | null
  color: string | null
  is_strategic: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface EconomicAgentType {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface StrategicService {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ActorEconomicProfile {
  id: string
  actor_id: string
  economic_agent_type_id: number | null
  primary_sector_id: number | null
  secondary_sector_ids: number[]
  annual_revenue: number | null
  employees_count: number
  formalization_status: string
  ruc_verified: boolean
  dgi_registered: boolean
  css_registered: boolean
  mitradel_registered: boolean
  services_used: number[]
  certifications: string[] | null
  export_ready: boolean
  digital_marketing: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EconomicStats {
  total_economic_actors: number
  by_sector: Record<string, number>
  by_agent_type: Record<string, number>
  by_formalization: Record<string, number>
}

export interface EconomicActorSummary {
  profile_id: string
  actor_id: string
  actor_full_name: string
  actor_type: string
  actor_status: string
  agent_type_code: string | null
  agent_type_name: string | null
  agent_category: string | null
  primary_sector_code: string | null
  primary_sector_name: string | null
  sector_category: string | null
  annual_revenue: number | null
  employees_count: number
  formalization_status: string
  ruc_verified: boolean
  dgi_registered: boolean
  css_registered: boolean
  export_ready: boolean
  digital_marketing: boolean
  territorial_name: string | null
  created_at: string
  updated_at: string
}

