-- =============================================================================
-- Multi-Tenant RLS Lockdown (Opción A estricta) – SIG-PSP
-- Migración incremental sobre 00019–00021.
--
-- Cambios:
--   A) Elimina el escape `OR tenant_actor_id IS NULL` de todas las policies
--      SELECT de roles no-admin. Filas legacy (tenant NULL) quedan accesibles
--      solo mediante has_role('admin').
--   B) Actualiza post_payment_to_journal para inferir y asignar tenant_actor_id;
--      falla explícitamente si no se puede inferir (modo seguro).
--   C) Endurece emit_fiscal_invoice_from_source(issuer_id,...) para no ocultar
--      errores de numeración cuando sí existe serie activa. Propaga tenant desde
--      el emisor al documento fiscal.
-- =============================================================================

-- =============================================================================
-- PARTE A: Reemplazar policies con escape tenant IS NULL
-- Regla: has_role('admin') = bypass total (admin ve/opera cualquier fila).
--        Roles no-admin: tenant_actor_id IS NOT NULL AND is_tenant_member(...).
--        Filas legacy (tenant NULL): solo has_role('admin').
-- =============================================================================

-- ----------------------------------------------------------------------------
-- chart_of_accounts
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coa_select" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_insert" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_update" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_delete" ON chart_of_accounts;

CREATE POLICY "coa_select"
    ON chart_of_accounts FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "coa_insert"
    ON chart_of_accounts FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "coa_update"
    ON chart_of_accounts FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "coa_delete"
    ON chart_of_accounts FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- journal_entries
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "je_select" ON journal_entries;
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
DROP POLICY IF EXISTS "je_update" ON journal_entries;
DROP POLICY IF EXISTS "je_delete" ON journal_entries;

CREATE POLICY "je_select"
    ON journal_entries FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "je_insert"
    ON journal_entries FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador']))
    );

CREATE POLICY "je_update"
    ON journal_entries FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "je_delete"
    ON journal_entries FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- journal_entry_lines (sin tenant_actor_id propio; aislamiento vía join a je)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "jel_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_delete" ON journal_entry_lines;

CREATE POLICY "jel_select"
    ON journal_entry_lines FOR SELECT
    USING (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND je.tenant_actor_id IS NOT NULL
              AND is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor'])
        )
    );

CREATE POLICY "jel_insert"
    ON journal_entry_lines FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND je.tenant_actor_id IS NOT NULL
              AND is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor','operador'])
        )
    );

CREATE POLICY "jel_update"
    ON journal_entry_lines FOR UPDATE
    USING (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND je.tenant_actor_id IS NOT NULL
              AND is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor'])
        )
    );

CREATE POLICY "jel_delete"
    ON journal_entry_lines FOR DELETE
    USING (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND je.tenant_actor_id IS NOT NULL
              AND is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin'])
        )
    );

-- ----------------------------------------------------------------------------
-- accounting_mappings
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "am_select" ON accounting_mappings;
DROP POLICY IF EXISTS "am_insert" ON accounting_mappings;
DROP POLICY IF EXISTS "am_update" ON accounting_mappings;
DROP POLICY IF EXISTS "am_delete" ON accounting_mappings;

CREATE POLICY "am_select"
    ON accounting_mappings FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "am_insert"
    ON accounting_mappings FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "am_update"
    ON accounting_mappings FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "am_delete"
    ON accounting_mappings FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- actor_tax_profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "atp_select" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_insert" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_update" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_delete" ON actor_tax_profiles;

CREATE POLICY "atp_select"
    ON actor_tax_profiles FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "atp_insert"
    ON actor_tax_profiles FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "atp_update"
    ON actor_tax_profiles FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "atp_delete"
    ON actor_tax_profiles FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- issuers
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "issuers_select" ON issuers;
DROP POLICY IF EXISTS "issuers_insert" ON issuers;
DROP POLICY IF EXISTS "issuers_update" ON issuers;
DROP POLICY IF EXISTS "issuers_delete" ON issuers;

CREATE POLICY "issuers_select"
    ON issuers FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "issuers_insert"
    ON issuers FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "issuers_update"
    ON issuers FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "issuers_delete"
    ON issuers FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_numbering_series
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fns_select" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_insert" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_update" ON fiscal_numbering_series;
DROP POLICY IF EXISTS "fns_delete" ON fiscal_numbering_series;

CREATE POLICY "fns_select"
    ON fiscal_numbering_series FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "fns_insert"
    ON fiscal_numbering_series FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fns_update"
    ON fiscal_numbering_series FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fns_delete"
    ON fiscal_numbering_series FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_documents
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fd_select" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_insert" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_update" ON fiscal_documents;
DROP POLICY IF EXISTS "fd_delete" ON fiscal_documents;

CREATE POLICY "fd_select"
    ON fiscal_documents FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "fd_insert"
    ON fiscal_documents FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fd_update"
    ON fiscal_documents FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fd_delete"
    ON fiscal_documents FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_document_lines
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fdl_select" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_insert" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_update" ON fiscal_document_lines;
DROP POLICY IF EXISTS "fdl_delete" ON fiscal_document_lines;

CREATE POLICY "fdl_select"
    ON fiscal_document_lines FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "fdl_insert"
    ON fiscal_document_lines FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fdl_update"
    ON fiscal_document_lines FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fdl_delete"
    ON fiscal_document_lines FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_taxes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ft_select" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_insert" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_update" ON fiscal_taxes;
DROP POLICY IF EXISTS "ft_delete" ON fiscal_taxes;

CREATE POLICY "ft_select"
    ON fiscal_taxes FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "ft_insert"
    ON fiscal_taxes FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ft_update"
    ON fiscal_taxes FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ft_delete"
    ON fiscal_taxes FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_withholdings
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fw_select" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_insert" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_update" ON fiscal_withholdings;
DROP POLICY IF EXISTS "fw_delete" ON fiscal_withholdings;

CREATE POLICY "fw_select"
    ON fiscal_withholdings FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "fw_insert"
    ON fiscal_withholdings FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fw_update"
    ON fiscal_withholdings FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "fw_delete"
    ON fiscal_withholdings FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- ----------------------------------------------------------------------------
-- fiscal_transmissions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ftx_select" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_insert" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_update" ON fiscal_transmissions;
DROP POLICY IF EXISTS "ftx_delete" ON fiscal_transmissions;

CREATE POLICY "ftx_select"
    ON fiscal_transmissions FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

CREATE POLICY "ftx_insert"
    ON fiscal_transmissions FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ftx_update"
    ON fiscal_transmissions FOR UPDATE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "ftx_delete"
    ON fiscal_transmissions FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- fiscal_events_log: sin tenant_actor_id; policies globales sin cambios (ver 00021).

-- =============================================================================
-- PARTE B: Actualizar post_payment_to_journal para propagar tenant_actor_id
--
-- Infiere tenant_actor_id desde las tablas fuente vinculadas por payment_id
-- (añadido en 00025_add_payment_id_to_sources.sql):
--   1) marketplace_orders  → buyer_id
--   2) membership_invoices → memberships.actor_id (join)
--   3) donations           → donor_actor_id
-- Si no se puede inferir: RAISE EXCEPTION (modo seguro).
-- =============================================================================
CREATE OR REPLACE FUNCTION post_payment_to_journal(p_payment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment           RECORD;
    v_mapping           RECORD;
    v_entry_id          UUID;
    v_tenant_actor_id   UUID;
BEGIN
    -- Verificar rol: permitir operador o superior (cubre gestor, admin)
    IF NOT has_role('operador') THEN
        RAISE EXCEPTION 'Permiso insuficiente para registrar asiento contable. Se requiere rol operador o superior.';
    END IF;

    -- Obtener datos del pago confirmado
    SELECT p.id, p.amount, p.concept_id, p.created_by
    INTO   v_payment
    FROM   payments p
    WHERE  p.id     = p_payment_id
      AND  p.status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago % no encontrado o no está en estado completed', p_payment_id;
    END IF;

    -- Inferir tenant_actor_id desde las tablas fuente (via payment_id FK de 00025)
    -- Intento 1: marketplace_orders → buyer_id
    SELECT o.buyer_id
    INTO   v_tenant_actor_id
    FROM   marketplace_orders o
    WHERE  o.payment_id = p_payment_id;

    -- Intento 2: membership_invoices → memberships.actor_id
    IF v_tenant_actor_id IS NULL THEN
        SELECT m.actor_id
        INTO   v_tenant_actor_id
        FROM   membership_invoices mi
        JOIN   memberships m ON m.id = mi.membership_id
        WHERE  mi.payment_id = p_payment_id;
    END IF;

    -- Intento 3: donations → donor_actor_id
    IF v_tenant_actor_id IS NULL THEN
        SELECT d.donor_actor_id
        INTO   v_tenant_actor_id
        FROM   donations d
        WHERE  d.payment_id = p_payment_id;
    END IF;

    -- Modo seguro: si no se pudo inferir el tenant, fallar explícitamente
    IF v_tenant_actor_id IS NULL THEN
        RAISE EXCEPTION
            'No se pudo inferir tenant_actor_id para el pago %: no está vinculado a ninguna '
            'marketplace_order, membership_invoice ni donation conocida.',
            p_payment_id;
    END IF;

    -- Obtener mapeo contable para el concepto del pago
    SELECT am.debit_account_id, am.credit_account_id
    INTO   v_mapping
    FROM   accounting_mappings am
    WHERE  am.payment_concept_id = v_payment.concept_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe mapeo contable para el concepto %', v_payment.concept_id;
    END IF;

    -- Idempotencia: si ya existe asiento para este pago, devolverlo
    SELECT id INTO v_entry_id
    FROM   journal_entries
    WHERE  source_type = 'payment'
      AND  source_id   = p_payment_id;

    IF FOUND THEN
        RETURN v_entry_id;
    END IF;

    -- Crear asiento con manejo de unique_violation (concurrencia segura)
    BEGIN
        INSERT INTO journal_entries (
            entry_date, description, source_type, source_id,
            status, posted_at, created_by, tenant_actor_id
        ) VALUES (
            CURRENT_DATE,
            'Pago confirmado: ' || p_payment_id::TEXT,
            'payment',
            p_payment_id,
            'posted',
            NOW(),
            v_payment.created_by,
            v_tenant_actor_id
        )
        RETURNING id INTO v_entry_id;

    EXCEPTION
        WHEN unique_violation THEN
            -- Otra sesión concurrente ya creó el asiento: devolver el existente
            SELECT id INTO v_entry_id
            FROM   journal_entries
            WHERE  source_type = 'payment'
              AND  source_id   = p_payment_id;
            RETURN v_entry_id;
    END;

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
    IS 'Crea o recupera el asiento contable para un pago confirmado. '
       'Infiere y asigna tenant_actor_id desde la fuente del pago; falla si no puede inferirlo. '
       'Idempotente, concurrencia segura, requiere rol operador o superior.';

-- =============================================================================
-- PARTE C: Hardening de emit_fiscal_invoice_from_source(p_issuer_id,...)
--
-- Cambios respecto a 00021:
--   • Verifica existencia de serie activa ANTES de llamar next_fiscal_number.
--   • Si la serie existe y next_fiscal_number falla → re-raise (no WHEN OTHERS).
--   • Si no existe serie activa → doc_number = NULL (comportamiento aceptado).
--   • Propaga tenant_actor_id del emisor al documento y sus líneas.
-- =============================================================================
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
    v_buyer_id          UUID;
    v_amount            NUMERIC(15,2);
    v_doc_id            UUID;
    v_line_desc         TEXT;
    v_series_prefix     TEXT;
    v_doc_number        BIGINT;
    v_doc_number_str    TEXT;
    v_has_series        BOOLEAN;
    v_issuer_tenant_id  UUID;
BEGIN
    -- Verificar que el emisor existe y está activo
    IF NOT EXISTS (SELECT 1 FROM issuers WHERE id = p_issuer_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'El emisor % no existe o no está activo', p_issuer_id;
    END IF;

    -- Obtener tenant del emisor para propagarlo al documento
    SELECT tenant_actor_id
    INTO   v_issuer_tenant_id
    FROM   issuers
    WHERE  id = p_issuer_id;

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

    -- Obtener datos de la entidad fuente según módulo
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

    -- Numeración fiscal: verificar existencia de serie activa antes de llamar
    -- next_fiscal_number. Si existe la serie y falla, la excepción se propaga
    -- (no se suprime con WHEN OTHERS).
    SELECT EXISTS (
        SELECT 1
        FROM   fiscal_numbering_series
        WHERE  issuer_id = p_issuer_id
          AND  doc_type  = 'invoice'
          AND  is_active = TRUE
    ) INTO v_has_series;

    IF v_has_series THEN
        -- Serie activa confirmada: obtener número (cualquier error se re-lanza)
        v_doc_number := next_fiscal_number(p_issuer_id, 'invoice');

        SELECT prefix
        INTO   v_series_prefix
        FROM   fiscal_numbering_series
        WHERE  issuer_id = p_issuer_id
          AND  doc_type  = 'invoice'
          AND  is_active = TRUE;

        v_doc_number_str := COALESCE(v_series_prefix || '-', '') || LPAD(v_doc_number::TEXT, 8, '0');
    ELSE
        -- Sin serie configurada: doc_number quedará NULL hasta asignación posterior
        v_doc_number_str := NULL;
    END IF;

    -- Crear documento fiscal con tenant propagado desde el emisor
    BEGIN
        INSERT INTO fiscal_documents (
            issuer_id, doc_type, status, doc_number,
            source_module, source_id,
            buyer_actor_id,
            subtotal, grand_total,
            issue_date,
            tenant_actor_id
        ) VALUES (
            p_issuer_id, 'invoice', 'ready_to_send', v_doc_number_str,
            p_source_module, p_source_id,
            v_buyer_id,
            v_amount, v_amount,
            CURRENT_DATE,
            v_issuer_tenant_id
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

    -- Crear línea de detalle con tenant propagado
    INSERT INTO fiscal_document_lines (
        document_id, line_number, description, quantity, unit_price, subtotal, tenant_actor_id
    ) VALUES (
        v_doc_id, 1, v_line_desc, 1, v_amount, v_amount, v_issuer_tenant_id
    );

    -- Registrar evento (fiscal_events_log no tiene tenant_actor_id; global)
    INSERT INTO fiscal_events_log (document_id, event_type, event_data)
    VALUES (v_doc_id, 'created_from_source',
            jsonb_build_object(
                'source_module', p_source_module,
                'source_id',     p_source_id,
                'issuer_id',     p_issuer_id,
                'doc_number',    v_doc_number_str,
                'tenant_actor_id', v_issuer_tenant_id
            ));

    -- TODO: cuando integration_outbox exista, encolar aquí la transmisión automática.

    RETURN v_doc_id;
END;
$$;

COMMENT ON FUNCTION emit_fiscal_invoice_from_source(UUID, TEXT, UUID)
    IS 'Crea (idempotente) una factura fiscal con issuer explícito. '
       'Verifica existencia de serie activa antes de numerar; si la serie existe y falla, re-lanza la excepción. '
       'Propaga tenant_actor_id del emisor al documento y sus líneas. '
       'Requiere p_issuer_id para soporte multi-emisor.';
