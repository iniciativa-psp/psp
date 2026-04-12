-- =============================================================================
-- Módulo Fiscal Core (PAC-agnóstico) – SIG-PSP
-- Facturación electrónica: series, documentos, líneas, impuestos,
-- retenciones, transmisiones, log de eventos y reglas paramétricas.
-- Compatible con: marketplace, membresías y donaciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Series de numeración fiscal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_numbering_series (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    issuer_id       UUID            NOT NULL REFERENCES issuers (id) ON DELETE RESTRICT,
    doc_type        VARCHAR(30)     NOT NULL,
    prefix          VARCHAR(20),
    -- Número actual (próximo a emitir)
    current_number  BIGINT          NOT NULL DEFAULT 1,
    -- Número máximo autorizado por la DGI (NULL = sin límite configurado)
    max_number      BIGINT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fns_pkey                 PRIMARY KEY (id),
    CONSTRAINT fns_issuer_doctype_uq    UNIQUE (issuer_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_fns_issuer   ON fiscal_numbering_series (issuer_id);
CREATE INDEX IF NOT EXISTS idx_fns_active   ON fiscal_numbering_series (is_active);

CREATE TRIGGER trg_fns_updated_at
    BEFORE UPDATE ON fiscal_numbering_series
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fiscal_numbering_series
    IS 'Series de numeración para documentos fiscales por emisor y tipo de documento';

-- -----------------------------------------------------------------------------
-- Documentos fiscales
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_documents (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    issuer_id       UUID            NOT NULL REFERENCES issuers (id) ON DELETE RESTRICT,
    doc_type        VARCHAR(30)     NOT NULL DEFAULT 'invoice',
    doc_number      VARCHAR(50),
    status          VARCHAR(30)     NOT NULL DEFAULT 'draft',
    -- Módulo y entidad de origen (para trazabilidad)
    source_module   VARCHAR(50),
    source_id       UUID,
    -- Receptor
    buyer_actor_id  UUID            REFERENCES actors (id) ON DELETE SET NULL,
    buyer_name      VARCHAR(255),
    buyer_ruc       VARCHAR(30),
    buyer_ruc_dv    VARCHAR(5),
    buyer_address   TEXT,
    -- Totales (calculados por RPC recalc_fiscal_document_totals)
    subtotal        NUMERIC(15,2)   NOT NULL DEFAULT 0,
    tax_total       NUMERIC(15,2)   NOT NULL DEFAULT 0,
    withholding_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(15,2)   NOT NULL DEFAULT 0,
    currency        CHAR(3)         NOT NULL DEFAULT 'USD',
    -- Fechas
    issue_date      DATE,
    due_date        DATE,
    -- Metadata
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fd_pkey          PRIMARY KEY (id),
    CONSTRAINT fd_status_check  CHECK (
        status IN ('draft','ready_to_send','sent','accepted','rejected','cancelled','voided')
    ),
    CONSTRAINT fd_doc_type_check CHECK (
        doc_type IN ('invoice','credit_note','debit_note','receipt')
    )
);

-- Idempotencia: un source_id genera a lo sumo 1 factura
CREATE UNIQUE INDEX IF NOT EXISTS uq_fd_source
    ON fiscal_documents (source_module, source_id)
    WHERE doc_type = 'invoice' AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fd_issuer        ON fiscal_documents (issuer_id);
CREATE INDEX IF NOT EXISTS idx_fd_status        ON fiscal_documents (status);
CREATE INDEX IF NOT EXISTS idx_fd_source        ON fiscal_documents (source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_fd_buyer         ON fiscal_documents (buyer_actor_id);
CREATE INDEX IF NOT EXISTS idx_fd_doc_number    ON fiscal_documents (doc_number) WHERE doc_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fd_issue_date    ON fiscal_documents (issue_date DESC NULLS LAST);

CREATE TRIGGER trg_fd_updated_at
    BEFORE UPDATE ON fiscal_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fiscal_documents
    IS 'Documentos fiscales electrónicos emitidos por el sistema (facturas, notas de crédito/débito)';

-- -----------------------------------------------------------------------------
-- Líneas de documento fiscal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_document_lines (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    document_id     UUID            NOT NULL REFERENCES fiscal_documents (id) ON DELETE CASCADE,
    line_number     SMALLINT        NOT NULL DEFAULT 1,
    description     TEXT            NOT NULL,
    quantity        NUMERIC(12,4)   NOT NULL DEFAULT 1,
    unit_price      NUMERIC(15,4)   NOT NULL DEFAULT 0,
    discount        NUMERIC(15,2)   NOT NULL DEFAULT 0,
    subtotal        NUMERIC(15,2)   NOT NULL DEFAULT 0,
    -- Referencia opcional a producto/servicio interno
    product_id      UUID,

    CONSTRAINT fdl_pkey             PRIMARY KEY (id),
    CONSTRAINT fdl_quantity_check   CHECK (quantity > 0),
    CONSTRAINT fdl_price_check      CHECK (unit_price >= 0),
    CONSTRAINT fdl_discount_check   CHECK (discount >= 0),
    CONSTRAINT fdl_subtotal_check   CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fdl_document ON fiscal_document_lines (document_id);

COMMENT ON TABLE fiscal_document_lines IS 'Líneas de detalle de documentos fiscales';

-- -----------------------------------------------------------------------------
-- Impuestos aplicados por línea / documento (fiscal_taxes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_taxes (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    document_id     UUID            NOT NULL REFERENCES fiscal_documents (id) ON DELETE CASCADE,
    line_id         UUID            REFERENCES fiscal_document_lines (id) ON DELETE CASCADE,
    tax_code        VARCHAR(20)     NOT NULL DEFAULT 'ITBMS',
    tax_rate        NUMERIC(7,4)    NOT NULL DEFAULT 0.07,
    taxable_amount  NUMERIC(15,2)   NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(15,2)   NOT NULL DEFAULT 0,

    CONSTRAINT ft_pkey              PRIMARY KEY (id),
    CONSTRAINT ft_rate_check        CHECK (tax_rate >= 0),
    CONSTRAINT ft_taxable_check     CHECK (taxable_amount >= 0),
    CONSTRAINT ft_amount_check      CHECK (tax_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ft_document  ON fiscal_taxes (document_id);
CREATE INDEX IF NOT EXISTS idx_ft_line      ON fiscal_taxes (line_id);

COMMENT ON TABLE fiscal_taxes IS 'Impuestos (ITBMS u otros) calculados por documento o línea';

-- -----------------------------------------------------------------------------
-- Retenciones fiscales (fiscal_withholdings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_withholdings (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    document_id         UUID            NOT NULL REFERENCES fiscal_documents (id) ON DELETE CASCADE,
    withholding_code    VARCHAR(30)     NOT NULL,
    rate                NUMERIC(7,4)    NOT NULL DEFAULT 0,
    base_amount         NUMERIC(15,2)   NOT NULL DEFAULT 0,
    withholding_amount  NUMERIC(15,2)   NOT NULL DEFAULT 0,

    CONSTRAINT fw_pkey              PRIMARY KEY (id),
    CONSTRAINT fw_rate_check        CHECK (rate >= 0),
    CONSTRAINT fw_base_check        CHECK (base_amount >= 0),
    CONSTRAINT fw_amount_check      CHECK (withholding_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fw_document ON fiscal_withholdings (document_id);

COMMENT ON TABLE fiscal_withholdings IS 'Retenciones fiscales aplicadas a documentos';

-- -----------------------------------------------------------------------------
-- Transmisiones al PAC / DGI (fiscal_transmissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_transmissions (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    document_id     UUID            NOT NULL REFERENCES fiscal_documents (id) ON DELETE CASCADE,
    pac_provider    VARCHAR(50),
    status          VARCHAR(30)     NOT NULL DEFAULT 'pending',
    request_payload JSONB,
    response_payload JSONB,
    error_message   TEXT,
    attempt_number  SMALLINT        NOT NULL DEFAULT 1,
    transmitted_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ftx_pkey             PRIMARY KEY (id),
    CONSTRAINT ftx_status_check     CHECK (
        status IN ('pending','in_progress','accepted','rejected','error')
    )
);

CREATE INDEX IF NOT EXISTS idx_ftx_document ON fiscal_transmissions (document_id);
CREATE INDEX IF NOT EXISTS idx_ftx_status   ON fiscal_transmissions (status);

CREATE TRIGGER trg_ftx_updated_at
    BEFORE UPDATE ON fiscal_transmissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fiscal_transmissions
    IS 'Registro de envios de documentos al PAC/DGI y sus respuestas';

-- -----------------------------------------------------------------------------
-- Log de eventos fiscales (fiscal_events_log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_events_log (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id     UUID            REFERENCES fiscal_documents (id) ON DELETE SET NULL,
    event_type      VARCHAR(50)     NOT NULL,
    event_data      JSONB,
    performed_by    UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fel_document ON fiscal_events_log (document_id);
CREATE INDEX IF NOT EXISTS idx_fel_type     ON fiscal_events_log (event_type);
CREATE INDEX IF NOT EXISTS idx_fel_date     ON fiscal_events_log (created_at DESC);

COMMENT ON TABLE fiscal_events_log IS 'Auditoría de eventos sobre documentos fiscales';

-- -----------------------------------------------------------------------------
-- Reglas de impuestos (parametrizables)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_tax_rules (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tax_code        VARCHAR(20)     NOT NULL,
    description     TEXT,
    default_rate    NUMERIC(7,4)    NOT NULL DEFAULT 0.07,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    effective_from  DATE,
    effective_to    DATE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ftr_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ftr_active ON fiscal_tax_rules (is_active);

CREATE TRIGGER trg_ftr_updated_at
    BEFORE UPDATE ON fiscal_tax_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fiscal_tax_rules
    IS 'Reglas de impuestos (ITBMS 7% por defecto); exenciones configuradas en fiscal_tax_rule_scopes';

-- Alcance / excepciones de reglas de impuesto
CREATE TABLE IF NOT EXISTS fiscal_tax_rule_scopes (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    rule_id         UUID            NOT NULL REFERENCES fiscal_tax_rules (id) ON DELETE CASCADE,
    scope_type      VARCHAR(30)     NOT NULL,   -- 'product','category','actor','module'
    scope_value     TEXT            NOT NULL,
    override_rate   NUMERIC(7,4)    NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ftrs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ftrs_rule ON fiscal_tax_rule_scopes (rule_id);

COMMENT ON TABLE fiscal_tax_rule_scopes
    IS 'Alcance de reglas de impuesto por tipo/categoria/actor/modulo';

-- -----------------------------------------------------------------------------
-- Reglas de retención (parametrizables)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_withholding_rules (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    withholding_code    VARCHAR(30)     NOT NULL,
    description         TEXT,
    rate                NUMERIC(7,4)    NOT NULL DEFAULT 0,
    -- Sobre qué base se calcula la retención
    base_amount_type    VARCHAR(20)     NOT NULL DEFAULT 'subtotal',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    effective_from      DATE,
    effective_to        DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fwr_pkey                 PRIMARY KEY (id),
    CONSTRAINT fwr_base_type_check      CHECK (
        base_amount_type IN ('subtotal','tax_total','grand_total')
    )
);

CREATE INDEX IF NOT EXISTS idx_fwr_active ON fiscal_withholding_rules (is_active);

CREATE TRIGGER trg_fwr_updated_at
    BEFORE UPDATE ON fiscal_withholding_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fiscal_withholding_rules
    IS 'Reglas de retención fiscal parametrizables (base: subtotal, tax_total o grand_total)';

-- Alcance / excepciones de reglas de retención
CREATE TABLE IF NOT EXISTS fiscal_withholding_rule_scopes (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    rule_id         UUID            NOT NULL REFERENCES fiscal_withholding_rules (id) ON DELETE CASCADE,
    scope_type      VARCHAR(30)     NOT NULL,   -- 'product','category','actor','module'
    scope_value     TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fwrs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_fwrs_rule ON fiscal_withholding_rule_scopes (rule_id);

COMMENT ON TABLE fiscal_withholding_rule_scopes
    IS 'Alcance de reglas de retencion por tipo/categoria/actor/modulo';

-- -----------------------------------------------------------------------------
-- RPC: next_fiscal_number
-- Obtiene y reserva el siguiente número de la serie (con locking transaccional).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_fiscal_number(
    p_issuer_id  UUID,
    p_doc_type   TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_series_id     UUID;
    v_next_number   BIGINT;
BEGIN
    -- Bloquear la fila de la serie para serializar emisiones concurrentes
    SELECT id, current_number
    INTO   v_series_id, v_next_number
    FROM   fiscal_numbering_series
    WHERE  issuer_id = p_issuer_id
      AND  doc_type  = p_doc_type
      AND  is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active numbering series for issuer % and doc_type %',
            p_issuer_id, p_doc_type;
    END IF;

    -- Avanzar el contador
    UPDATE fiscal_numbering_series
       SET current_number = current_number + 1
     WHERE id = v_series_id;

    RETURN v_next_number;
END;
$$;

COMMENT ON FUNCTION next_fiscal_number(UUID, TEXT)
    IS 'Obtiene y reserva de forma atómica el siguiente número de la serie fiscal (con FOR UPDATE).';

-- -----------------------------------------------------------------------------
-- RPC: recalc_fiscal_document_totals
-- Recalcula subtotal, tax_total, withholding_total y grand_total del documento.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalc_fiscal_document_totals(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subtotal          NUMERIC(15,2);
    v_tax_total         NUMERIC(15,2);
    v_withholding_total NUMERIC(15,2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0)
    INTO   v_subtotal
    FROM   fiscal_document_lines
    WHERE  document_id = p_document_id;

    SELECT COALESCE(SUM(tax_amount), 0)
    INTO   v_tax_total
    FROM   fiscal_taxes
    WHERE  document_id = p_document_id;

    SELECT COALESCE(SUM(withholding_amount), 0)
    INTO   v_withholding_total
    FROM   fiscal_withholdings
    WHERE  document_id = p_document_id;

    UPDATE fiscal_documents
       SET subtotal           = v_subtotal,
           tax_total          = v_tax_total,
           withholding_total  = v_withholding_total,
           grand_total        = v_subtotal + v_tax_total - v_withholding_total
     WHERE id = p_document_id;
END;
$$;

COMMENT ON FUNCTION recalc_fiscal_document_totals(UUID)
    IS 'Recalcula los totales (subtotal, impuestos, retenciones, grand_total) de un documento fiscal.';

-- -----------------------------------------------------------------------------
-- RPC: emit_fiscal_invoice_from_source
-- Crea un documento fiscal tipo 'invoice' en estado 'ready_to_send' a partir
-- de una entidad fuente (marketplace_orders, membership_invoices, donations).
-- La emisión definitiva al PAC queda pendiente para la app o un job externo.
-- TODO: cuando integration_outbox exista, encolar aquí la transmisión automática.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION emit_fiscal_invoice_from_source(
    p_source_module  TEXT,
    p_source_id      UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_issuer_id     UUID;
    v_buyer_id      UUID;
    v_amount        NUMERIC(15,2);
    v_doc_id        UUID;
    v_line_desc     TEXT;
BEGIN
    -- Validar modulo
    IF p_source_module NOT IN ('marketplace','memberships','donations') THEN
        RAISE EXCEPTION 'source_module % no soportado. Valores validos: marketplace, memberships, donations',
            p_source_module;
    END IF;

    -- Idempotencia: si ya existe factura para esta fuente, devolverla
    SELECT id INTO v_doc_id
    FROM   fiscal_documents
    WHERE  source_module = p_source_module
      AND  source_id     = p_source_id
      AND  doc_type      = 'invoice';

    IF FOUND THEN
        RETURN v_doc_id;
    END IF;

    -- Obtener el primer emisor activo del sistema (MVP: un solo emisor)
    SELECT id INTO v_issuer_id
    FROM   issuers
    WHERE  is_active = TRUE
    LIMIT  1;

    IF v_issuer_id IS NULL THEN
        RAISE EXCEPTION 'No hay emisor activo configurado en el sistema';
    END IF;

    -- Obtener datos de la fuente segun modulo
    IF p_source_module = 'marketplace' THEN
        SELECT o.buyer_id, o.total
        INTO   v_buyer_id, v_amount
        FROM   marketplace_orders o
        WHERE  o.id = p_source_id;
        v_line_desc := 'Pedido marketplace #' || p_source_id::TEXT;

    ELSIF p_source_module = 'memberships' THEN
        SELECT m.actor_id, mi.amount
        INTO   v_buyer_id, v_amount
        FROM   membership_invoices mi
        JOIN   memberships m ON m.id = mi.membership_id
        WHERE  mi.id = p_source_id;
        v_line_desc := 'Factura membresía #' || p_source_id::TEXT;

    ELSIF p_source_module = 'donations' THEN
        SELECT d.donor_actor_id, d.amount
        INTO   v_buyer_id, v_amount
        FROM   donations d
        WHERE  d.id = p_source_id;
        v_line_desc := 'Donación #' || p_source_id::TEXT;
    END IF;

    IF v_amount IS NULL THEN
        RAISE EXCEPTION 'No se encontró la entidad fuente % / %', p_source_module, p_source_id;
    END IF;

    -- Crear documento fiscal
    INSERT INTO fiscal_documents (
        issuer_id, doc_type, status,
        source_module, source_id,
        buyer_actor_id,
        subtotal, grand_total,
        issue_date
    ) VALUES (
        v_issuer_id, 'invoice', 'ready_to_send',
        p_source_module, p_source_id,
        v_buyer_id,
        v_amount, v_amount,
        CURRENT_DATE
    )
    RETURNING id INTO v_doc_id;

    -- Crear línea de detalle
    INSERT INTO fiscal_document_lines (document_id, line_number, description, quantity, unit_price, subtotal)
    VALUES (v_doc_id, 1, v_line_desc, 1, v_amount, v_amount);

    -- Registrar evento
    INSERT INTO fiscal_events_log (document_id, event_type, event_data)
    VALUES (v_doc_id, 'created_from_source',
            jsonb_build_object('source_module', p_source_module, 'source_id', p_source_id));

    RETURN v_doc_id;
END;
$$;

COMMENT ON FUNCTION emit_fiscal_invoice_from_source(TEXT, UUID)
    IS 'Crea (idempotente) una factura fiscal en estado ready_to_send a partir de una fuente (marketplace/memberships/donations).';

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

-- fiscal_numbering_series
ALTER TABLE fiscal_numbering_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fns_select"
    ON fiscal_numbering_series FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fns_insert"
    ON fiscal_numbering_series FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fns_update"
    ON fiscal_numbering_series FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fns_delete"
    ON fiscal_numbering_series FOR DELETE
    USING (has_role('admin'));

-- fiscal_documents
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fd_select"
    ON fiscal_documents FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fd_insert"
    ON fiscal_documents FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fd_update"
    ON fiscal_documents FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fd_delete"
    ON fiscal_documents FOR DELETE
    USING (has_role('admin'));

-- fiscal_document_lines
ALTER TABLE fiscal_document_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fdl_select"
    ON fiscal_document_lines FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fdl_insert"
    ON fiscal_document_lines FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fdl_update"
    ON fiscal_document_lines FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fdl_delete"
    ON fiscal_document_lines FOR DELETE
    USING (has_role('admin'));

-- fiscal_taxes
ALTER TABLE fiscal_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ft_select"
    ON fiscal_taxes FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "ft_insert"
    ON fiscal_taxes FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ft_update"
    ON fiscal_taxes FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ft_delete"
    ON fiscal_taxes FOR DELETE
    USING (has_role('admin'));

-- fiscal_withholdings
ALTER TABLE fiscal_withholdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fw_select"
    ON fiscal_withholdings FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fw_insert"
    ON fiscal_withholdings FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fw_update"
    ON fiscal_withholdings FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fw_delete"
    ON fiscal_withholdings FOR DELETE
    USING (has_role('admin'));

-- fiscal_transmissions
ALTER TABLE fiscal_transmissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftx_select"
    ON fiscal_transmissions FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "ftx_insert"
    ON fiscal_transmissions FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftx_update"
    ON fiscal_transmissions FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftx_delete"
    ON fiscal_transmissions FOR DELETE
    USING (has_role('admin'));

-- fiscal_events_log
ALTER TABLE fiscal_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fel_select"
    ON fiscal_events_log FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fel_insert"
    ON fiscal_events_log FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor') OR has_role('operador'));

-- fiscal_tax_rules
ALTER TABLE fiscal_tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftr_select"
    ON fiscal_tax_rules FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "ftr_insert"
    ON fiscal_tax_rules FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftr_update"
    ON fiscal_tax_rules FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftr_delete"
    ON fiscal_tax_rules FOR DELETE
    USING (has_role('admin'));

-- fiscal_tax_rule_scopes
ALTER TABLE fiscal_tax_rule_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftrs_select"
    ON fiscal_tax_rule_scopes FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "ftrs_insert"
    ON fiscal_tax_rule_scopes FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftrs_update"
    ON fiscal_tax_rule_scopes FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "ftrs_delete"
    ON fiscal_tax_rule_scopes FOR DELETE
    USING (has_role('admin'));

-- fiscal_withholding_rules
ALTER TABLE fiscal_withholding_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fwr_select"
    ON fiscal_withholding_rules FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fwr_insert"
    ON fiscal_withholding_rules FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fwr_update"
    ON fiscal_withholding_rules FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fwr_delete"
    ON fiscal_withholding_rules FOR DELETE
    USING (has_role('admin'));

-- fiscal_withholding_rule_scopes
ALTER TABLE fiscal_withholding_rule_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fwrs_select"
    ON fiscal_withholding_rule_scopes FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "fwrs_insert"
    ON fiscal_withholding_rule_scopes FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fwrs_update"
    ON fiscal_withholding_rule_scopes FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "fwrs_delete"
    ON fiscal_withholding_rule_scopes FOR DELETE
    USING (has_role('admin'));
