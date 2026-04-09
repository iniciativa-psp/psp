-- =============================================================================
-- Fase 2 – Módulo Oportunidades
-- Oportunidades de desarrollo económico vinculadas a estrategia y territorio
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE opportunity_type AS ENUM (
    'capacitacion',
    'financiamiento',
    'mercado',
    'infraestructura',
    'asistencia_tecnica',
    'alianza',
    'investigacion',
    'donacion'
);

CREATE TYPE opportunity_status AS ENUM (
    'draft',
    'published',
    'active',
    'closed',
    'completed',
    'cancelled'
);

-- -----------------------------------------------------------------------------
-- Tabla principal: opportunities
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
    id                      UUID                NOT NULL DEFAULT gen_random_uuid(),
    strategy_id             UUID                REFERENCES strategy_items(id) ON DELETE SET NULL,
    title                   VARCHAR(255)        NOT NULL,
    description             TEXT,
    opportunity_type        opportunity_type    NOT NULL,
    status                  opportunity_status  NOT NULL DEFAULT 'draft',
    provider_actor_id       UUID                REFERENCES actors(id) ON DELETE SET NULL,
    territorial_id          BIGINT              REFERENCES territorial_items(id) ON DELETE SET NULL,
    target_sectors          TEXT[],
    target_actor_types      TEXT[],
    budget_available        NUMERIC(18, 2),
    currency                VARCHAR(3)          NOT NULL DEFAULT 'USD',
    beneficiaries_target    INTEGER,
    beneficiaries_current   INTEGER             NOT NULL DEFAULT 0,
    start_date              DATE,
    end_date                DATE,
    application_deadline    DATE,
    requirements            TEXT,
    contact_info            TEXT,
    external_url            TEXT,
    is_active               BOOLEAN             NOT NULL DEFAULT TRUE,
    created_by              UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT opportunities_pkey PRIMARY KEY (id),
    CONSTRAINT opportunities_dates_check CHECK (
        start_date IS NULL OR end_date IS NULL OR start_date <= end_date
    )
);

CREATE INDEX IF NOT EXISTS idx_opportunities_strategy       ON opportunities (strategy_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_type           ON opportunities (opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status         ON opportunities (status);
CREATE INDEX IF NOT EXISTS idx_opportunities_provider       ON opportunities (provider_actor_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_territorial    ON opportunities (territorial_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_active      ON opportunities (is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline       ON opportunities (application_deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_dates          ON opportunities (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by     ON opportunities (created_by);

CREATE TRIGGER trg_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE opportunities IS 'Oportunidades de desarrollo económico (capacitación, financiamiento, mercados, etc.)';

-- -----------------------------------------------------------------------------
-- Tabla: opportunity_applications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunity_applications (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    opportunity_id      UUID            NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    applicant_actor_id  UUID            NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    status              VARCHAR(30)     NOT NULL DEFAULT 'pending',
    notes               TEXT,
    reviewed_by         UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT opportunity_applications_pkey PRIMARY KEY (id),
    CONSTRAINT opportunity_applications_status_check CHECK (
        status IN ('pending', 'reviewing', 'approved', 'rejected', 'withdrawn')
    ),
    CONSTRAINT opportunity_applications_unique UNIQUE (opportunity_id, applicant_actor_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_applications_opportunity  ON opportunity_applications (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_applications_applicant    ON opportunity_applications (applicant_actor_id);
CREATE INDEX IF NOT EXISTS idx_opp_applications_status       ON opportunity_applications (status);

CREATE TRIGGER trg_opportunity_applications_updated_at
    BEFORE UPDATE ON opportunity_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE opportunity_applications IS 'Postulaciones a oportunidades de desarrollo';

-- -----------------------------------------------------------------------------
-- Vista: v_opportunities_summary
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_opportunities_summary AS
SELECT
    o.id,
    o.strategy_id,
    o.title,
    o.description,
    o.opportunity_type,
    o.status,
    o.provider_actor_id,
    a.full_name              AS provider_name,
    o.territorial_id,
    t.name                   AS territorial_name,
    o.target_sectors,
    o.target_actor_types,
    o.budget_available,
    o.currency,
    o.beneficiaries_target,
    o.beneficiaries_current,
    o.start_date,
    o.end_date,
    o.application_deadline,
    o.requirements,
    o.contact_info,
    o.external_url,
    o.is_active,
    o.created_by,
    o.created_at,
    o.updated_at,
    (SELECT COUNT(*) FROM opportunity_applications oa WHERE oa.opportunity_id = o.id)::INTEGER AS application_count
FROM opportunities o
LEFT JOIN actors            a ON a.id = o.provider_actor_id
LEFT JOIN territorial_items t ON t.id = o.territorial_id;

-- -----------------------------------------------------------------------------
-- Función: get_opportunity_stats()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_opportunity_stats()
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', (SELECT COUNT(*) FROM opportunities WHERE is_active),
        'by_type', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT opportunity_type, COUNT(*)::INTEGER AS count
                FROM opportunities WHERE is_active
                GROUP BY opportunity_type ORDER BY count DESC
            ) t
        ),
        'by_status', (
            SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
            FROM (
                SELECT status, COUNT(*)::INTEGER AS count
                FROM opportunities WHERE is_active
                GROUP BY status ORDER BY count DESC
            ) s
        ),
        'total_budget', (
            SELECT COALESCE(SUM(budget_available), 0)
            FROM opportunities WHERE is_active AND status IN ('published', 'active')
        ),
        'total_applications', (SELECT COUNT(*) FROM opportunity_applications),
        'total_beneficiaries_target', (
            SELECT COALESCE(SUM(beneficiaries_target), 0)
            FROM opportunities WHERE is_active
        ),
        'total_beneficiaries_current', (
            SELECT COALESCE(SUM(beneficiaries_current), 0)
            FROM opportunities WHERE is_active
        )
    ) INTO result;
    RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities_read_authenticated"
    ON opportunities FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "opportunities_write_operador"
    ON opportunities FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "opportunities_update_operador"
    ON opportunities FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "opportunities_delete_admin"
    ON opportunities FOR DELETE
    USING (has_role('admin'));

ALTER TABLE opportunity_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_applications_read_authenticated"
    ON opportunity_applications FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "opp_applications_write_operador"
    ON opportunity_applications FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "opp_applications_update_operador"
    ON opportunity_applications FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "opp_applications_delete_admin"
    ON opportunity_applications FOR DELETE
    USING (has_role('admin'));
