-- =============================================================================
-- Módulo Pagos – SIG-PSP
-- Gestión de pagos y conceptos de cobro para la Iniciativa Panamá Sin Pobreza
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Conceptos de pago (catálogo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_concepts (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency    CHAR(3)      NOT NULL DEFAULT 'USD',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT payment_concepts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_payment_concepts_active ON payment_concepts (is_active);

CREATE TRIGGER trg_payment_concepts_updated_at
    BEFORE UPDATE ON payment_concepts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE payment_concepts IS 'Catálogo de conceptos de pago (cuotas, multas, servicios, etc.)';

-- -----------------------------------------------------------------------------
-- Beneficiarios / Pagadores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiaries (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    full_name       VARCHAR(255) NOT NULL,
    id_number       VARCHAR(50),              -- cédula / pasaporte
    email           VARCHAR(255),
    phone           VARCHAR(30),
    -- Ubicación territorial
    territorial_id  BIGINT       REFERENCES territorial_items (id) ON DELETE SET NULL,
    address         TEXT,
    notes           TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT beneficiaries_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_id_number    ON beneficiaries (id_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_territorial  ON beneficiaries (territorial_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_active       ON beneficiaries (is_active);

CREATE TRIGGER trg_beneficiaries_updated_at
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE beneficiaries IS 'Beneficiarios y/o pagadores registrados en el sistema';

-- -----------------------------------------------------------------------------
-- Pagos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    concept_id      UUID          NOT NULL REFERENCES payment_concepts (id) ON DELETE RESTRICT,
    beneficiary_id  UUID                   REFERENCES beneficiaries (id)    ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency        CHAR(3)       NOT NULL DEFAULT 'USD',
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending',
    payment_date    TIMESTAMPTZ,
    reference_code  VARCHAR(100),           -- código de referencia externo
    notes           TEXT,
    created_by      UUID,                   -- auth.users.id (Supabase Auth)
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT payments_pkey        PRIMARY KEY (id),
    CONSTRAINT payments_status_check CHECK (
        status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')
    )
);

CREATE INDEX IF NOT EXISTS idx_payments_concept     ON payments (concept_id);
CREATE INDEX IF NOT EXISTS idx_payments_beneficiary ON payments (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_date        ON payments (payment_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_payments_reference   ON payments (reference_code);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE payments IS 'Registro de pagos realizados por los beneficiarios';

-- -----------------------------------------------------------------------------
-- Historial de cambios de estado de pagos (auditoría)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_status_log (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id  UUID        NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
    old_status  VARCHAR(20),
    new_status  VARCHAR(20) NOT NULL,
    changed_by  UUID,
    notes       TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_log_payment ON payment_status_log (payment_id);

CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_status_log (payment_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_status_log
    AFTER UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_payment_status_change();

-- -----------------------------------------------------------------------------
-- Vista de resumen de pagos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_payments_summary AS
SELECT
    p.id,
    p.reference_code,
    p.status,
    p.amount,
    p.currency,
    p.payment_date,
    pc.name  AS concept_name,
    b.full_name AS beneficiary_name,
    b.id_number AS beneficiary_id_number,
    ti.name  AS territorial_name,
    ti.type  AS territorial_type,
    p.created_at
FROM payments p
LEFT JOIN payment_concepts pc ON pc.id = p.concept_id
LEFT JOIN beneficiaries     b  ON b.id  = p.beneficiary_id
LEFT JOIN territorial_items ti ON ti.id = b.territorial_id;

-- -----------------------------------------------------------------------------
-- Función: totales por concepto
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_payment_totals_by_concept(
    p_status   TEXT    DEFAULT 'completed',
    p_currency CHAR(3) DEFAULT 'USD'
)
RETURNS TABLE (
    concept_id   UUID,
    concept_name VARCHAR,
    total_amount NUMERIC,
    payment_count BIGINT
)
LANGUAGE sql STABLE AS $$
SELECT
    pc.id,
    pc.name,
    COALESCE(SUM(p.amount), 0) AS total_amount,
    COUNT(p.id)                AS payment_count
FROM payment_concepts pc
LEFT JOIN payments p
    ON p.concept_id = pc.id
    AND p.status    = p_status
    AND p.currency  = p_currency
GROUP BY pc.id, pc.name
ORDER BY total_amount DESC;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE payment_concepts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_status_log ENABLE ROW LEVEL SECURITY;

-- Lectura pública para conceptos activos
CREATE POLICY "payment_concepts_public_read"
    ON payment_concepts FOR SELECT
    USING (is_active = TRUE);

-- Gestores autenticados pueden ver y escribir todo
CREATE POLICY "payment_concepts_auth_all"
    ON payment_concepts FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "beneficiaries_auth_all"
    ON beneficiaries FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "payments_auth_all"
    ON payments FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "payment_log_auth_read"
    ON payment_status_log FOR SELECT
    USING (auth.role() = 'authenticated');
