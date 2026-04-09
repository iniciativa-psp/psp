-- =============================================================================
-- Fase 2 – Módulo Donaciones y Patrocinios
-- Gestión de donaciones, patrocinios y métricas de recaudación
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE donation_type AS ENUM (
    'efectivo',
    'especie',
    'voluntariado',
    'servicios'
);

CREATE TYPE sponsorship_level AS ENUM (
    'bronce',
    'plata',
    'oro',
    'platino',
    'diamante'
);

-- -----------------------------------------------------------------------------
-- Tabla: donations
-- Registro de donaciones recibidas por la Iniciativa
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS donations (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    donor_actor_id          UUID            REFERENCES actors(id) ON DELETE SET NULL,
    strategy_id             UUID            REFERENCES strategy_items(id) ON DELETE SET NULL,
    territorial_id          BIGINT          REFERENCES territorial_items(id) ON DELETE SET NULL,
    donation_type           donation_type   NOT NULL DEFAULT 'efectivo',
    amount                  NUMERIC(14, 2),
    currency                VARCHAR(3)      DEFAULT 'USD',
    description             TEXT,
    is_recurring            BOOLEAN         DEFAULT FALSE,
    recurrence_period       VARCHAR(20)
                                CHECK (recurrence_period IN ('monthly', 'quarterly', 'annual')),
    certificate_code        VARCHAR(100),
    certificate_issued_at   TIMESTAMPTZ,
    receipt_url             TEXT,
    status                  VARCHAR(30)     DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    donation_date           DATE            DEFAULT CURRENT_DATE,
    notes                   TEXT,
    created_by              UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT donations_pkey       PRIMARY KEY (id),
    CONSTRAINT donations_cert_unique UNIQUE (certificate_code)
);

CREATE INDEX IF NOT EXISTS idx_donations_donor         ON donations (donor_actor_id);
CREATE INDEX IF NOT EXISTS idx_donations_strategy      ON donations (strategy_id);
CREATE INDEX IF NOT EXISTS idx_donations_status        ON donations (status);
CREATE INDEX IF NOT EXISTS idx_donations_date          ON donations (donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_type          ON donations (donation_type);

CREATE TRIGGER trg_donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE donations IS 'Registro de donaciones recibidas: efectivo, especie, voluntariado y servicios';

-- -----------------------------------------------------------------------------
-- Tabla: sponsorships
-- Patrocinios corporativos y de organizaciones
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sponsorships (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    sponsor_actor_id    UUID                NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    strategy_id         UUID                REFERENCES strategy_items(id) ON DELETE SET NULL,
    territorial_id      BIGINT              REFERENCES territorial_items(id) ON DELETE SET NULL,
    level               sponsorship_level   NOT NULL DEFAULT 'bronce',
    amount_annual       NUMERIC(14, 2)      NOT NULL,
    currency            VARCHAR(3)          DEFAULT 'USD',
    logo_url            TEXT,
    visibility_config   JSONB               DEFAULT '{}',   -- tamaño logo, posición, etc.
    branding_rights     TEXT,
    start_date          DATE                NOT NULL,
    end_date            DATE,
    status              VARCHAR(30)         DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    contract_url        TEXT,
    notes               TEXT,
    created_by          UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT sponsorships_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_actor    ON sponsorships (sponsor_actor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_level    ON sponsorships (level);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status   ON sponsorships (status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_dates    ON sponsorships (start_date, end_date);

CREATE TRIGGER trg_sponsorships_updated_at
    BEFORE UPDATE ON sponsorships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE sponsorships IS 'Patrocinios recibidos: niveles bronce, plata, oro, platino y diamante';

-- -----------------------------------------------------------------------------
-- Vista: v_fundraising_summary
-- Resumen de recaudación: donaciones por mes/tipo/estrategia, ranking y patrocinios
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_fundraising_summary AS
-- Donaciones mensuales por tipo y estrategia
SELECT
    'donation'                              AS source,
    DATE_TRUNC('month', d.donation_date)    AS period,
    d.donation_type::TEXT                   AS category,
    s.code                                  AS strategy_code,
    s.name                                  AS strategy_name,
    COUNT(d.id)                             AS transaction_count,
    COALESCE(SUM(d.amount), 0)             AS total_amount,
    d.currency
FROM donations d
LEFT JOIN strategy_items s ON s.id = d.strategy_id
WHERE d.status = 'confirmed'
GROUP BY
    DATE_TRUNC('month', d.donation_date),
    d.donation_type,
    s.code,
    s.name,
    d.currency

UNION ALL

-- Patrocinios activos por nivel (convertido a mensual)
SELECT
    'sponsorship'                           AS source,
    DATE_TRUNC('month', NOW())              AS period,
    sp.level::TEXT                          AS category,
    si.code                                 AS strategy_code,
    si.name                                 AS strategy_name,
    COUNT(sp.id)                            AS transaction_count,
    COALESCE(SUM(sp.amount_annual / 12), 0) AS total_amount,
    sp.currency
FROM sponsorships sp
LEFT JOIN strategy_items si ON si.id = sp.strategy_id
WHERE sp.status = 'active'
GROUP BY
    sp.level,
    si.code,
    si.name,
    sp.currency;

COMMENT ON VIEW v_fundraising_summary IS 'Resumen mensual de donaciones y patrocinios para tableros de recaudación';

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donations_read_authenticated"
    ON donations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "donations_insert_operador"
    ON donations FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "donations_update_gestor"
    ON donations FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "donations_delete_admin"
    ON donations FOR DELETE USING (has_role('admin'));

-- ---

ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsorships_read_authenticated"
    ON sponsorships FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sponsorships_insert_gestor"
    ON sponsorships FOR INSERT WITH CHECK (has_role('gestor'));

CREATE POLICY "sponsorships_update_gestor"
    ON sponsorships FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "sponsorships_delete_admin"
    ON sponsorships FOR DELETE USING (has_role('admin'));
