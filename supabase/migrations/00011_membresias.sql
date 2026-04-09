-- =============================================================================
-- Fase 2 – Módulo Membresías y Suscripciones
-- Planes, membresías activas, historial de estados y facturación
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE membership_status AS ENUM (
    'pending',
    'active',
    'past_due',
    'suspended',
    'cancelled',
    'expired'
);

CREATE TYPE plan_status AS ENUM (
    'draft',
    'published',
    'archived'
);

CREATE TYPE payment_method_type AS ENUM (
    'yappy',
    'tarjeta',
    'transferencia',
    'efectivo',
    'wallet',
    'subsidio',
    'patrocinio',
    'manual'
);

-- -----------------------------------------------------------------------------
-- Tabla: membership_plans
-- Catálogo de planes de membresía disponibles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS membership_plans (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    code                VARCHAR(50)     NOT NULL,
    name                VARCHAR(200)    NOT NULL,
    description         TEXT,
    actor_type_allowed  actor_type[],                           -- NULL = todos los tipos
    price_monthly       NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    price_quarterly     NUMERIC(12, 2),
    price_semiannual    NUMERIC(12, 2),
    price_annual        NUMERIC(12, 2),
    currency            VARCHAR(3)      NOT NULL DEFAULT 'USD',
    trial_days          SMALLINT        DEFAULT 0,
    features            JSONB           NOT NULL DEFAULT '[]',  -- [{featureCode, label, limit, unit}]
    max_transactions    INT,
    max_users           SMALLINT,
    is_private          BOOLEAN         DEFAULT FALSE,
    sort_order          SMALLINT        DEFAULT 0,
    status              plan_status     NOT NULL DEFAULT 'draft',
    version             SMALLINT        NOT NULL DEFAULT 1,
    created_by          UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT membership_plans_pkey        PRIMARY KEY (id),
    CONSTRAINT membership_plans_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_mplans_status     ON membership_plans (status);
CREATE INDEX IF NOT EXISTS idx_mplans_sort_order ON membership_plans (sort_order);

CREATE TRIGGER trg_membership_plans_updated_at
    BEFORE UPDATE ON membership_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE membership_plans IS 'Catálogo de planes de membresía del sistema PSP';

-- -----------------------------------------------------------------------------
-- Tabla: memberships
-- Membresías activas y su historial por actor
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memberships (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    actor_id            UUID                NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    plan_id             UUID                NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    status              membership_status   NOT NULL DEFAULT 'pending',
    start_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    end_at              TIMESTAMPTZ,
    renew_at            TIMESTAMPTZ,
    grace_period_days   SMALLINT            DEFAULT 7,
    auto_renew          BOOLEAN             DEFAULT TRUE,
    cancel_reason       VARCHAR(200),
    cancelled_at        TIMESTAMPTZ,
    cancelled_by        UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    suspended_at        TIMESTAMPTZ,
    suspended_reason    TEXT,
    suspended_by        UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    amount_paid         NUMERIC(12, 2),
    payment_method      payment_method_type,
    metadata            JSONB               DEFAULT '{}',
    created_by          UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT memberships_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_actor_id  ON memberships (actor_id);
CREATE INDEX IF NOT EXISTS idx_memberships_plan_id   ON memberships (plan_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status    ON memberships (status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_at    ON memberships (end_at);

CREATE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE memberships IS 'Membresías de actores: suscripciones activas, suspendidas y canceladas';

-- -----------------------------------------------------------------------------
-- Tabla: membership_status_log
-- Bitácora automática de cambios de estado
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS membership_status_log (
    id              BIGINT              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    membership_id   UUID                NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    old_status      membership_status,
    new_status      membership_status   NOT NULL,
    changed_by      UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    notes           TEXT,
    changed_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mstatus_log_membership ON membership_status_log (membership_id);
CREATE INDEX IF NOT EXISTS idx_mstatus_log_changed_at ON membership_status_log (changed_at);

COMMENT ON TABLE membership_status_log IS 'Bitácora de cambios de estado de membresías';

-- Función trigger para registrar cambios de estado
CREATE OR REPLACE FUNCTION log_membership_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO membership_status_log (membership_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_membership_status_log
    AFTER UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION log_membership_status_change();

-- -----------------------------------------------------------------------------
-- Tabla: membership_invoices
-- Facturas vinculadas a membresías
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS membership_invoices (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    membership_id   UUID            NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(50)     NOT NULL,   -- correlativo único
    amount          NUMERIC(12, 2)  NOT NULL,
    itbms           NUMERIC(12, 2)  DEFAULT 0,
    total           NUMERIC(12, 2)  NOT NULL,
    currency        VARCHAR(3)      DEFAULT 'USD',
    status          VARCHAR(20)     DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    payment_method  payment_method_type,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT membership_invoices_pkey           PRIMARY KEY (id),
    CONSTRAINT membership_invoices_number_unique  UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_minvoices_membership ON membership_invoices (membership_id);
CREATE INDEX IF NOT EXISTS idx_minvoices_status     ON membership_invoices (status);
CREATE INDEX IF NOT EXISTS idx_minvoices_due_date   ON membership_invoices (due_date);

COMMENT ON TABLE membership_invoices IS 'Facturas de cobro de membresías';

-- -----------------------------------------------------------------------------
-- Vista: v_memberships_summary
-- Vista resumida con datos del actor, plan y cálculos de vencimiento
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_memberships_summary AS
SELECT
    m.id,
    m.actor_id,
    a.full_name                                                 AS actor_full_name,
    a.actor_type,
    m.plan_id,
    p.code                                                      AS plan_code,
    p.name                                                      AS plan_name,
    p.price_monthly,
    m.status,
    m.start_at,
    m.end_at,
    m.renew_at,
    m.grace_period_days,
    m.auto_renew,
    m.amount_paid,
    m.payment_method,
    m.cancel_reason,
    m.cancelled_at,
    m.suspended_at,
    -- Días restantes (negativo = vencido)
    CASE
        WHEN m.end_at IS NOT NULL
        THEN EXTRACT(DAY FROM (m.end_at - NOW()))::INTEGER
        ELSE NULL
    END                                                         AS days_remaining,
    -- Indicador de vencimiento próximo (dentro de 7 días)
    CASE
        WHEN m.end_at IS NOT NULL
             AND m.end_at > NOW()
             AND m.end_at < NOW() + INTERVAL '7 days'
        THEN TRUE
        ELSE FALSE
    END                                                         AS is_expiring_soon,
    t.name                                                      AS territorial_name,
    m.created_by,
    m.created_at,
    m.updated_at
FROM memberships m
JOIN actors               a ON a.id = m.actor_id
JOIN membership_plans     p ON p.id = m.plan_id
LEFT JOIN territorial_items t ON t.id = a.territorial_id;

COMMENT ON VIEW v_memberships_summary IS 'Vista de membresías con datos del actor, plan y métricas de vencimiento';

-- -----------------------------------------------------------------------------
-- Función: get_membership_metrics()
-- Métricas globales del módulo de membresías
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_membership_metrics()
RETURNS TABLE (
    activas         BIGINT,
    por_vencer_7_dias BIGINT,
    vencidas        BIGINT,
    en_mora         BIGINT,
    mrr             NUMERIC
)
LANGUAGE sql STABLE AS $$
SELECT
    COUNT(*) FILTER (WHERE m.status = 'active')                                                     AS activas,
    COUNT(*) FILTER (
        WHERE m.status = 'active'
          AND m.end_at IS NOT NULL
          AND m.end_at > NOW()
          AND m.end_at < NOW() + INTERVAL '7 days'
    )                                                                                               AS por_vencer_7_dias,
    COUNT(*) FILTER (WHERE m.status = 'expired')                                                    AS vencidas,
    COUNT(*) FILTER (WHERE m.status = 'past_due')                                                   AS en_mora,
    COALESCE(SUM(p.price_monthly) FILTER (WHERE m.status = 'active'), 0)                           AS mrr
FROM memberships m
JOIN membership_plans p ON p.id = m.plan_id;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mplans_read_authenticated"
    ON membership_plans FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "mplans_insert_gestor"
    ON membership_plans FOR INSERT
    WITH CHECK (has_role('gestor'));

CREATE POLICY "mplans_update_gestor"
    ON membership_plans FOR UPDATE
    USING (has_role('gestor'));

CREATE POLICY "mplans_delete_admin"
    ON membership_plans FOR DELETE
    USING (has_role('admin'));

-- ---

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_read_authenticated"
    ON memberships FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "memberships_insert_operador"
    ON memberships FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "memberships_update_operador"
    ON memberships FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "memberships_delete_admin"
    ON memberships FOR DELETE
    USING (has_role('admin'));

-- ---

ALTER TABLE membership_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mlog_read_authenticated"
    ON membership_status_log FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ---

ALTER TABLE membership_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minvoices_read_authenticated"
    ON membership_invoices FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "minvoices_insert_operador"
    ON membership_invoices FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "minvoices_update_gestor"
    ON membership_invoices FOR UPDATE
    USING (has_role('gestor'));

CREATE POLICY "minvoices_delete_admin"
    ON membership_invoices FOR DELETE
    USING (has_role('admin'));

-- -----------------------------------------------------------------------------
-- Seed: planes iniciales del sistema PSP
-- -----------------------------------------------------------------------------

INSERT INTO membership_plans
    (code, name, description, price_monthly, price_annual, sort_order, status, features)
VALUES
    ('hogar_solidario',         'Hogar Solidario',                  'Plan gratuito para hogares en situación de vulnerabilidad',                                    0,      0,      1,  'published', '[{"featureCode":"basic_profile","label":"Perfil básico"}]'),
    ('agricultor',              'Agricultor',                       'Plan mensual para productores agrícolas y agropecuarios',                                       5,      50,     2,  'published', '[{"featureCode":"basic_profile","label":"Perfil básico"},{"featureCode":"market_access","label":"Acceso a mercado"}]'),
    ('artesano',                'Artesano',                         'Plan mensual para artesanos y productores de bienes culturales',                                5,      50,     3,  'published', '[{"featureCode":"basic_profile","label":"Perfil básico"},{"featureCode":"catalog","label":"Catálogo de productos"}]'),
    ('comercio_mercadito',      'Comercio / Mercadito',             'Plan mensual para pequeños comercios y mercaditos comunitarios',                                20,     200,    4,  'published', '[{"featureCode":"pos","label":"Punto de venta"},{"featureCode":"inventory","label":"Inventario básico"}]'),
    ('empresa_solidaria',       'Empresa Solidaria',                'Plan mensual para empresas con impacto social declarado',                                       50,     500,    5,  'published', '[{"featureCode":"full_erp","label":"ERP completo"},{"featureCode":"reports","label":"Reportes avanzados"}]'),
    ('ong_cooperativa',         'ONG / Cooperativa',                'Plan mensual para organizaciones sin fines de lucro y cooperativas',                            20,     200,    6,  'published', '[{"featureCode":"members","label":"Gestión de socios"},{"featureCode":"projects","label":"Gestión de proyectos"}]'),
    ('socio_estrategico_per',   'Socio Estratégico Personal',       'Plan mensual para personas que desean ser socios estratégicos individuales',                    10,     100,    7,  'published', '[{"featureCode":"networking","label":"Red de contactos"},{"featureCode":"events","label":"Eventos exclusivos"}]'),
    ('socio_estrategico_emp',   'Socio Estratégico Empresarial',    'Plan mensual para empresas socias estratégicas de alto impacto',                                100,    1000,   8,  'published', '[{"featureCode":"branding","label":"Visibilidad de marca"},{"featureCode":"reports","label":"Reportes de impacto"}]'),
    ('inversor_social_per',     'Inversor Social Tipo B Personal',  'Plan mensual para inversores sociales individuales (rango $5-$25, valor por defecto $15)',       15,     150,    9,  'published', '[{"featureCode":"impact_report","label":"Reporte de impacto"},{"featureCode":"portfolio","label":"Portafolio social"}]'),
    ('inversor_social_com',     'Inversor Social Tipo B Comercial', 'Plan mensual para inversores sociales de carácter comercial (valor por defecto $35)',           35,     350,    10, 'published', '[{"featureCode":"impact_report","label":"Reporte de impacto"},{"featureCode":"portfolio","label":"Portafolio comercial"},{"featureCode":"branding","label":"Visibilidad de marca"}]')
ON CONFLICT (code) DO NOTHING;
