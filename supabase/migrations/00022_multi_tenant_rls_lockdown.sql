-- =============================================================================
-- Multi-Tenant RLS Lockdown (Opción A — estricto) – SIG-PSP
-- Migración incremental sobre 00019–00021.
-- Cambios:
--   1) RLS lockdown estricto: elimina "OR tenant_actor_id IS NULL" para no-admin.
--      Filas sin tenant_actor_id solo son visibles para has_role('admin').
--   2) post_payment_to_journal: infiere tenant_actor_id desde fuentes de pago
--      y lo setea en journal_entries al insertar.
--   3) emit_fiscal_invoice_from_source (3 args): elimina EXCEPTION WHEN OTHERS;
--      propaga errores reales de next_fiscal_number.
-- =============================================================================

-- =============================================================================
-- PARTE 1: RLS LOCKDOWN ESTRICTO
-- Para no-admin: tenant_actor_id IS NOT NULL es obligatorio.
-- Para admin: bypass total (has_role('admin')).
-- fiscal_events_log se mantiene global (sin tenant por ahora).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- chart_of_accounts
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coa_select" ON chart_of_accounts;

CREATE POLICY "coa_select"
    ON chart_of_accounts FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- journal_entries
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "je_select" ON journal_entries;

CREATE POLICY "je_select"
    ON journal_entries FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- journal_entry_lines (acceso vía join con journal_entries)
-- -----------------------------------------------------------------------------
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
              AND is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor'])
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

-- -----------------------------------------------------------------------------
-- accounting_mappings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "am_select" ON accounting_mappings;

CREATE POLICY "am_select"
    ON accounting_mappings FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- actor_tax_profiles
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "atp_select" ON actor_tax_profiles;

CREATE POLICY "atp_select"
    ON actor_tax_profiles FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- issuers
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "issuers_select" ON issuers;

CREATE POLICY "issuers_select"
    ON issuers FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_numbering_series
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fns_select" ON fiscal_numbering_series;

CREATE POLICY "fns_select"
    ON fiscal_numbering_series FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_documents
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fd_select" ON fiscal_documents;

CREATE POLICY "fd_select"
    ON fiscal_documents FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_document_lines
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fdl_select" ON fiscal_document_lines;

CREATE POLICY "fdl_select"
    ON fiscal_document_lines FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_taxes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ft_select" ON fiscal_taxes;

CREATE POLICY "ft_select"
    ON fiscal_taxes FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_withholdings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fw_select" ON fiscal_withholdings;

CREATE POLICY "fw_select"
    ON fiscal_withholdings FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- -----------------------------------------------------------------------------
-- fiscal_transmissions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ftx_select" ON fiscal_transmissions;

CREATE POLICY "ftx_select"
    ON fiscal_transmissions FOR SELECT
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
    );

-- fiscal_events_log: se mantiene global (sin filtro tenant por ahora)
-- No se modifica la política "fel_select" de 00021_fiscal_core_multi_issuer.sql.


-- =============================================================================
-- PARTE 2: post_payment_to_journal — inferencia de tenant_actor_id
-- Reemplaza la versión de 00019_accounting_hardening.sql.
-- Infiere tenant_actor_id desde las fuentes de pago:
--   - marketplace_orders (via payment_id → order_items.seller_id; single-seller)
--   - membership_invoices (via payment_id → memberships.actor_id)
--   - donations: rechaza explícitamente (donor_actor_id no es tenant)
-- Setea tenant_actor_id en journal_entries al insertar.
-- Requiere: migración 00025_add_payment_id_to_sources.sql ya aplicada.
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
    v_seller_count      INT;
BEGIN
    -- Verificar rol: permitir a operador o superior (cubre gestor, admin, superadmin)
    IF NOT has_role('operador') THEN
        RAISE EXCEPTION 'Permiso insuficiente para registrar asiento contable. Se requiere rol operador o superior.';
    END IF;

    -- Obtener datos del pago confirmado
    SELECT p.id, p.amount, p.concept_id, p.created_by
    INTO   v_payment
    FROM   payments p
    WHERE  p.id = p_payment_id
      AND  p.status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago % no encontrado o no está en estado completed', p_payment_id;
    END IF;

    -- Obtener mapeo contable para el concepto
    SELECT am.debit_account_id, am.credit_account_id
    INTO   v_mapping
    FROM   accounting_mappings am
    WHERE  am.payment_concept_id = v_payment.concept_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe mapeo contable para el concepto %', v_payment.concept_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Inferir tenant_actor_id desde las fuentes de pago
    -- Orden: marketplace → memberships → donations (rechaza)
    -- -------------------------------------------------------------------------

    -- 1. Marketplace: marketplace_orders.payment_id → marketplace_order_items.seller_id
    --    Requiere exactamente 1 vendedor distinto por pedido.
    --    Nota: depende de 00025_add_payment_id_to_sources.sql.
    SELECT COUNT(DISTINCT moi.seller_id)
    INTO   v_seller_count
    FROM   marketplace_orders mo
    JOIN   marketplace_order_items moi ON moi.order_id = mo.id
    WHERE  mo.payment_id = p_payment_id;

    IF v_seller_count = 1 THEN
        SELECT DISTINCT moi.seller_id
        INTO   v_tenant_actor_id
        FROM   marketplace_orders mo
        JOIN   marketplace_order_items moi ON moi.order_id = mo.id
        WHERE  mo.payment_id = p_payment_id;

    ELSIF v_seller_count > 1 THEN
        RAISE EXCEPTION
            'El pago % corresponde a un pedido con % vendedores distintos. '
            'No se puede inferir tenant_actor_id automáticamente para órdenes multi-vendedor.',
            p_payment_id, v_seller_count;
    END IF;

    -- 2. Memberships: membership_invoices.payment_id → memberships.actor_id
    --    Solo si no se encontró por marketplace.
    IF v_tenant_actor_id IS NULL THEN
        SELECT m.actor_id
        INTO   v_tenant_actor_id
        FROM   membership_invoices mi
        JOIN   memberships m ON m.id = mi.membership_id
        WHERE  mi.payment_id = p_payment_id
        LIMIT  1;
    END IF;

    -- 3. Donations: donor_actor_id no es un tenant; rechazar explícitamente.
    IF v_tenant_actor_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM donations WHERE payment_id = p_payment_id) THEN
            RAISE EXCEPTION
                'El pago % corresponde a una donación. '
                'El donor_actor_id no es un tenant; no se puede registrar asiento contable de tenant para donaciones.',
                p_payment_id;
        END IF;
    END IF;

    -- Si no se pudo inferir el tenant, fallar con mensaje claro.
    IF v_tenant_actor_id IS NULL THEN
        RAISE EXCEPTION
            'No se pudo inferir tenant_actor_id para el pago %. '
            'El pago no está vinculado a marketplace_orders ni membership_invoices.',
            p_payment_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Idempotencia: si ya existe asiento para este pago, devolverlo
    -- -------------------------------------------------------------------------
    SELECT id INTO v_entry_id
    FROM   journal_entries
    WHERE  source_type = 'payment'
      AND  source_id   = p_payment_id;

    IF FOUND THEN
        RETURN v_entry_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Crear asiento con manejo de unique_violation (concurrencia)
    -- -------------------------------------------------------------------------
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
       'Infiere tenant_actor_id desde marketplace_orders (single-seller) o membership_invoices. '
       'Rechaza donaciones (donor no es tenant). Falla si no puede inferir tenant. '
       'Idempotente, concurrencia segura, requiere rol operador o superior.';


-- =============================================================================
-- PARTE 3: emit_fiscal_invoice_from_source — endurecer numeración fiscal
-- Reemplaza la versión de 00021_fiscal_core_multi_issuer.sql.
-- Elimina EXCEPTION WHEN OTHERS: propaga errores reales de next_fiscal_number.
-- Si existe serie activa: asignar doc_number (propagar si falla).
-- Si no existe serie activa: doc_number queda NULL.
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
    v_buyer_id       UUID;
    v_amount         NUMERIC(15,2);
    v_doc_id         UUID;
    v_line_desc      TEXT;
    v_series_prefix  TEXT;
    v_doc_number     BIGINT;
    v_doc_number_str TEXT;
    v_series_exists  BOOLEAN;
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

    -- -------------------------------------------------------------------------
    -- Numeración fiscal: verificar si existe serie activa antes de llamar
    -- next_fiscal_number. Si existe, propagar cualquier error (no WHEN OTHERS).
    -- Si no existe, doc_number queda NULL.
    -- -------------------------------------------------------------------------
    SELECT EXISTS (
        SELECT 1 FROM fiscal_numbering_series
        WHERE  issuer_id = p_issuer_id
          AND  doc_type  = 'invoice'
          AND  is_active = TRUE
    ) INTO v_series_exists;

    IF v_series_exists THEN
        -- next_fiscal_number puede fallar (ej. serie expirada entre el EXISTS y el FOR UPDATE).
        -- Dejamos que la excepción se propague sin capturarla.
        v_doc_number := next_fiscal_number(p_issuer_id, 'invoice');

        SELECT prefix INTO v_series_prefix
        FROM   fiscal_numbering_series
        WHERE  issuer_id = p_issuer_id
          AND  doc_type  = 'invoice'
          AND  is_active = TRUE;

        v_doc_number_str := COALESCE(v_series_prefix || '-', '') || LPAD(v_doc_number::TEXT, 8, '0');
    ELSE
        -- Sin serie activa: continuar sin doc_number (se asignará manualmente más adelante)
        v_doc_number_str := NULL;
    END IF;

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
    IS 'Crea (idempotente) una factura fiscal con issuer explícito. '
       'Si existe serie activa: asigna doc_number y propaga errores de next_fiscal_number. '
       'Si no existe serie activa: doc_number queda NULL. '
       'Requiere p_issuer_id para soporte multi-emisor.';
