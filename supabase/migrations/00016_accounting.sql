-- =============================================================================
-- Módulo Contabilidad (Accounting MVP) – SIG-PSP
-- COA, asientos contables y mapeo con conceptos de pago
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo de cuentas contables (Chart of Accounts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    code        VARCHAR(30)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    type        VARCHAR(20)     NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT coa_pkey         PRIMARY KEY (id),
    CONSTRAINT coa_code_unique  UNIQUE (code),
    CONSTRAINT coa_type_check   CHECK (type IN ('asset','liability','equity','revenue','expense'))
);

CREATE INDEX IF NOT EXISTS idx_coa_type     ON chart_of_accounts (type);
CREATE INDEX IF NOT EXISTS idx_coa_active   ON chart_of_accounts (is_active);

COMMENT ON TABLE chart_of_accounts IS 'Plan de cuentas contables del sistema PSP';

-- -----------------------------------------------------------------------------
-- Asientos contables (Journal Entries)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    entry_date  DATE            NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    source_type VARCHAR(50),
    source_id   UUID,
    status      VARCHAR(10)     NOT NULL DEFAULT 'draft',
    posted_at   TIMESTAMPTZ,
    created_by  UUID,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT je_pkey          PRIMARY KEY (id),
    CONSTRAINT je_status_check  CHECK (status IN ('draft','posted'))
);

-- Índice único parcial: un payment genera a lo sumo 1 asiento
CREATE UNIQUE INDEX IF NOT EXISTS uq_je_payment_source
    ON journal_entries (source_type, source_id)
    WHERE source_type = 'payment' AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_je_entry_date    ON journal_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status        ON journal_entries (status);
CREATE INDEX IF NOT EXISTS idx_je_source        ON journal_entries (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_je_created_by    ON journal_entries (created_by);

CREATE TRIGGER trg_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE journal_entries IS 'Cabeceras de asientos contables';

-- -----------------------------------------------------------------------------
-- Líneas de asiento contable (Journal Entry Lines)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    entry_id    UUID            NOT NULL REFERENCES journal_entries (id) ON DELETE CASCADE,
    account_id  UUID            NOT NULL REFERENCES chart_of_accounts (id) ON DELETE RESTRICT,
    memo        TEXT,
    debit       NUMERIC(15,2)   NOT NULL DEFAULT 0,
    credit      NUMERIC(15,2)   NOT NULL DEFAULT 0,

    CONSTRAINT jel_pkey             PRIMARY KEY (id),
    CONSTRAINT jel_debit_nn         CHECK (debit  >= 0),
    CONSTRAINT jel_credit_nn        CHECK (credit >= 0),
    CONSTRAINT jel_one_side_only    CHECK (debit = 0 OR credit = 0)
);

CREATE INDEX IF NOT EXISTS idx_jel_entry    ON journal_entry_lines (entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account  ON journal_entry_lines (account_id);

COMMENT ON TABLE journal_entry_lines IS 'Líneas de cargo/abono de cada asiento contable';

-- -----------------------------------------------------------------------------
-- Mapeo concepto de pago ↔ cuentas contables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounting_mappings (
    id                  UUID    NOT NULL DEFAULT gen_random_uuid(),
    payment_concept_id  UUID    NOT NULL REFERENCES payment_concepts (id) ON DELETE CASCADE,
    debit_account_id    UUID    NOT NULL REFERENCES chart_of_accounts (id) ON DELETE RESTRICT,
    credit_account_id   UUID    NOT NULL REFERENCES chart_of_accounts (id) ON DELETE RESTRICT,

    CONSTRAINT am_pkey                  PRIMARY KEY (id),
    CONSTRAINT am_concept_unique        UNIQUE (payment_concept_id)
);

COMMENT ON TABLE accounting_mappings IS 'Mapeo de conceptos de pago a cuentas contables de cargo y abono';

-- -----------------------------------------------------------------------------
-- RPC: post_payment_to_journal
-- Crea asiento contable para un pago confirmado (idempotente).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION post_payment_to_journal(p_payment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment       RECORD;
    v_mapping       RECORD;
    v_entry_id      UUID;
BEGIN
    -- Obtener datos del pago
    SELECT p.id, p.amount, p.concept_id, p.created_by
    INTO   v_payment
    FROM   payments p
    WHERE  p.id = p_payment_id
      AND  p.status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment % not found or not completed', p_payment_id;
    END IF;

    -- Obtener mapeo contable para el concepto
    SELECT am.debit_account_id, am.credit_account_id
    INTO   v_mapping
    FROM   accounting_mappings am
    WHERE  am.payment_concept_id = v_payment.concept_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No accounting mapping found for concept %', v_payment.concept_id;
    END IF;

    -- Idempotencia: si ya existe asiento para este pago, devolverlo
    SELECT id INTO v_entry_id
    FROM   journal_entries
    WHERE  source_type = 'payment'
      AND  source_id   = p_payment_id;

    IF FOUND THEN
        RETURN v_entry_id;
    END IF;

    -- Crear cabecera de asiento
    INSERT INTO journal_entries (entry_date, description, source_type, source_id, status, posted_at, created_by)
    VALUES (
        CURRENT_DATE,
        'Pago confirmado: ' || p_payment_id::TEXT,
        'payment',
        p_payment_id,
        'posted',
        NOW(),
        v_payment.created_by
    )
    RETURNING id INTO v_entry_id;

    -- Línea de cargo (debit)
    INSERT INTO journal_entry_lines (entry_id, account_id, memo, debit, credit)
    VALUES (v_entry_id, v_mapping.debit_account_id, 'Cargo por pago', v_payment.amount, 0);

    -- Línea de abono (credit)
    INSERT INTO journal_entry_lines (entry_id, account_id, memo, debit, credit)
    VALUES (v_entry_id, v_mapping.credit_account_id, 'Abono por pago', 0, v_payment.amount);

    RETURN v_entry_id;
END;
$$;

COMMENT ON FUNCTION post_payment_to_journal(UUID)
    IS 'Crea o recupera el asiento contable para un pago confirmado (idempotente).';

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

-- chart_of_accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_select"
    ON chart_of_accounts FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "coa_insert"
    ON chart_of_accounts FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "coa_update"
    ON chart_of_accounts FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "coa_delete"
    ON chart_of_accounts FOR DELETE
    USING (has_role('admin'));

-- journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "je_select"
    ON journal_entries FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "je_insert"
    ON journal_entries FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "je_update"
    ON journal_entries FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "je_delete"
    ON journal_entries FOR DELETE
    USING (has_role('admin'));

-- journal_entry_lines
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jel_select"
    ON journal_entry_lines FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "jel_insert"
    ON journal_entry_lines FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "jel_update"
    ON journal_entry_lines FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "jel_delete"
    ON journal_entry_lines FOR DELETE
    USING (has_role('admin'));

-- accounting_mappings
ALTER TABLE accounting_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "am_select"
    ON accounting_mappings FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "am_insert"
    ON accounting_mappings FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "am_update"
    ON accounting_mappings FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "am_delete"
    ON accounting_mappings FOR DELETE
    USING (has_role('admin'));
