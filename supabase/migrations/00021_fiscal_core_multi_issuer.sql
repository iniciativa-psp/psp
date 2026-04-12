-- =============================================================================
-- Fiscal Core: Multi-Emisor + Hardening – SIG-PSP
-- Migración incremental sobre 00018_fiscal_core.sql
-- Agrega: tenant_actor_id, issuer explícito en emit_fiscal_invoice_from_source,
-- SET search_path en funciones SECURITY DEFINER, asignación de doc_number.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Agregar tenant_actor_id a tablas fiscales core (nullable para compat.)
-- -----------------------------------------------------------------------------
ALTER TABLE fiscal_numbering_series
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fiscal_documents
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fiscal_document_lines
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fiscal_taxes
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fiscal_withholdings
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE fiscal_transmissions
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

-- Índices para filtrado eficiente por tenant
CREATE INDEX IF NOT EXISTS idx_fns_tenant   ON fiscal_numbering_series (tenant_actor_id) WHERE tenant_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fd_tenant    ON fiscal_documents         (tenant_actor_id) WHERE tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Unicidad por tenant en fiscal_documents
-- Reemplaza el índice global uq_fd_source cuando tenant_actor_id esté presente.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_fd_tenant_source
    ON fiscal_documents (tenant_actor_id, source_module, source_id)
    WHERE doc_type = 'invoice'
      AND source_id       IS NOT NULL
      AND tenant_actor_id IS NOT NULL;

-- Unicidad de serie por tenant + emisor + tipo de documento
CREATE UNIQUE INDEX IF NOT EXISTS uq_fns_tenant_issuer_doctype
    ON fiscal_numbering_series (tenant_actor_id, issuer_id, doc_type)
    WHERE tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RPC: next_fiscal_number (con SET search_path = public)
-- Reemplaza la versión de 00018_fiscal_core.sql.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_fiscal_number(
    p_issuer_id  UUID,
    p_doc_type   TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        RAISE EXCEPTION 'No hay serie de numeración activa para el emisor % y tipo %',
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
-- RPC: recalc_fiscal_document_totals (con SET search_path = public)
-- Reemplaza la versión de 00018_fiscal_core.sql.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalc_fiscal_document_totals(p_document_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
-- RPC: emit_fiscal_invoice_from_source (versión con issuer explícito)
-- Firma nueva: (p_issuer_id uuid, p_source_module text, p_source_id uuid)
-- Asigna doc_number usando next_fiscal_number al crear el documento.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION emit_fiscal_invoice_from_source(
    p_issuer_id     UUID,
    p_source_module TEXT,
    p_source_id     UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_buyer_id      UUID;
    v_amount        NUMERIC(15,2);
    v_doc_id        UUID;
    v_line_desc     TEXT;
    v_series_prefix TEXT;
    v_doc_number    BIGINT;
    v_doc_number_str TEXT;
BEGIN
    -- Verificar que el emisor existe y está activo
    IF NOT EXISTS (SELECT 1 FROM issuers WHERE id = p_issuer_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'El emisor % no existe o no está activo', p_issuer_id;
    END IF;

    -- Validar módulo fuente
    IF p_source_module NOT IN ('marketplace', 'memberships', 'donations') THEN
        RAISE EXCEPTION 'source_module % no soportado. Valores válidos: marketplace, memberships, donations',
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

    -- Obtener datos de la fuente según módulo
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

    -- Intentar obtener número fiscal; si no hay serie activa, doc_number queda NULL
    BEGIN
        v_doc_number := next_fiscal_number(p_issuer_id, 'invoice');

        SELECT prefix INTO v_series_prefix
        FROM   fiscal_numbering_series
        WHERE  issuer_id = p_issuer_id
          AND  doc_type  = 'invoice'
          AND  is_active = TRUE;

        v_doc_number_str := COALESCE(v_series_prefix || '-', '') || LPAD(v_doc_number::TEXT, 8, '0');

    EXCEPTION
        WHEN OTHERS THEN
            -- Sin serie configurada: continuar sin doc_number (se asignará más adelante)
            v_doc_number_str := NULL;
    END;

    -- Crear documento fiscal
    BEGIN
        INSERT INTO fiscal_documents (
            issuer_id, doc_type, status, doc_number,
            source_module, source_id,
            buyer_actor_id,
            subtotal, grand_total,
            issue_date
        ) VALUES (
            p_issuer_id, 'invoice', 'ready_to_send', v_doc_number_str,
            p_source_module, p_source_id,
            v_buyer_id,
            v_amount, v_amount,
            CURRENT_DATE
        )
        RETURNING id INTO v_doc_id;

    EXCEPTION
        WHEN unique_violation THEN
            -- Otra sesión concurrente ya creó el documento: devolver el existente
            SELECT id INTO v_doc_id
            FROM   fiscal_documents
            WHERE  source_module = p_source_module
              AND  source_id     = p_source_id
              AND  doc_type      = 'invoice';
            RETURN v_doc_id;
    END;

    -- Crear línea de detalle
    INSERT INTO fiscal_document_lines (document_id, line_number, description, quantity, unit_price, subtotal)
    VALUES (v_doc_id, 1, v_line_desc, 1, v_amount, v_amount);

    -- Registrar evento
    INSERT INTO fiscal_events_log (document_id, event_type, event_data)
    VALUES (v_doc_id, 'created_from_source',
            jsonb_build_object(
                'source_module', p_source_module,
                'source_id',     p_source_id,
                'issuer_id',     p_issuer_id,
                'doc_number',    v_doc_number_str
            ));

    -- TODO: cuando integration_outbox exista, encolar aquí la transmisión automática.

    RETURN v_doc_id;
END;
$$;

COMMENT ON FUNCTION emit_fiscal_invoice_from_source(UUID, TEXT, UUID)
    IS 'Crea (idempotente) una factura fiscal con issuer explícito. Asigna doc_number si hay serie activa. Requiere p_issuer_id para soporte multi-emisor.';

-- -----------------------------------------------------------------------------
-- RPC: emit_fiscal_invoice_from_source (wrapper legado — 2 argumentos)
-- Mantiene la firma original para compatibilidad.
-- Falla si hay 0 o más de 1 emisor activo en el sistema (no usa LIMIT 1).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION emit_fiscal_invoice_from_source(
    p_source_module TEXT,
    p_source_id     UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_issuer_id     UUID;
    v_issuer_count  INT;
BEGIN
    -- Contar emisores activos (no LIMIT 1: fallo explícito en escenario multi-emisor)
    SELECT COUNT(*), MIN(id)
    INTO   v_issuer_count, v_issuer_id
    FROM   issuers
    WHERE  is_active = TRUE;

    IF v_issuer_count = 0 THEN
        RAISE EXCEPTION 'No hay emisor activo configurado en el sistema. Configure al menos un emisor antes de emitir facturas.';
    END IF;

    IF v_issuer_count > 1 THEN
        RAISE EXCEPTION 'Hay % emisores activos. Use emit_fiscal_invoice_from_source(p_issuer_id, p_source_module, p_source_id) especificando el emisor.',
            v_issuer_count;
    END IF;

    -- Exactamente 1 emisor activo: delegar a la versión con issuer explícito
    RETURN emit_fiscal_invoice_from_source(v_issuer_id, p_source_module, p_source_id);
END;
$$;

COMMENT ON FUNCTION emit_fiscal_invoice_from_source(TEXT, UUID)
    IS 'Wrapper legado (1 emisor). Si hay 0 o más de 1 emisor activo, lanza excepción con mensaje claro. Use la versión con p_issuer_id para multi-emisor.';

-- -----------------------------------------------------------------------------
-- Actualizar RLS de tablas fiscales core: admin bypass + membresía de tenant
-- Se reemplazan las políticas de 00018_fiscal_core.sql.
-- -----------------------------------------------------------------------------

-- fiscal_numbering_series
DROP POLICY IF EXISTS "fns_select" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_insert" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_update" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_delete" ON fiscal_numbering_series;

CREATE POLICY "fns_select"
    ON fiscal_numbering_series FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "fns_insert"
    ON fiscal_numbering_series FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fns_update"
    ON fiscal_numbering_series FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fns_delete"
    ON fiscal_numbering_series FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_documents
DROP POLICY IF EXISTS "fd_select" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_insert" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_update" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_delete" ON fiscal_documents;

CREATE POLICY "fd_select"
    ON fiscal_documents FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "fd_insert"
    ON fiscal_documents FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fd_update"
    ON fiscal_documents FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fd_delete"
    ON fiscal_documents FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_document_lines
DROP POLICY IF EXISTS "fdl_select" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_insert" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_update" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_delete" ON fiscal_document_lines;

CREATE POLICY "fdl_select"
    ON fiscal_document_lines FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "fdl_insert"
    ON fiscal_document_lines FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fdl_update"
    ON fiscal_document_lines FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fdl_delete"
    ON fiscal_document_lines FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_taxes
DROP POLICY IF EXISTS "ft_select" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_insert" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_update" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_delete" ON fiscal_taxes;

CREATE POLICY "ft_select"
    ON fiscal_taxes FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "ft_insert"
    ON fiscal_taxes FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ft_update"
    ON fiscal_taxes FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ft_delete"
    ON fiscal_taxes FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_withholdings
DROP POLICY IF EXISTS "fw_select" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_insert" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_update" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_delete" ON fiscal_withholdings;

CREATE POLICY "fw_select"
    ON fiscal_withholdings FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "fw_insert"
    ON fiscal_withholdings FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fw_update"
    ON fiscal_withholdings FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fw_delete"
    ON fiscal_withholdings FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_transmissions
DROP POLICY IF EXISTS "ftx_select" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_insert" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_update" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_delete" ON fiscal_transmissions;

CREATE POLICY "ftx_select"
    ON fiscal_transmissions FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "ftx_insert"
    ON fiscal_transmissions FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ftx_update"
    ON fiscal_transmissions FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ftx_delete"
    ON fiscal_transmissions FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_events_log: solo admin puede eliminar; insert permitido a operador+
DROP POLICY IF EXISTS "fel_select" ON fiscal_events_log;
DROP POLICY IF EXISTS "fel_insert" ON fiscal_events_log;

CREATE POLICY "fel_select"
    ON fiscal_events_log FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR has_role('operador')
    );

CREATE POLICY "fel_insert"
    ON fiscal_events_log FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR has_role('operador')
    );
