-- =============================================================================
-- 00024_memberships_add_issuer_id.sql
--
-- Agrega membership_invoices.issuer_id (FK a issuers.id) para identificar
-- explícitamente la organización emisora de cada factura de membresía.
--
-- Contexto:
--   memberships.actor_id = miembro/cliente (NO el issuer/tenant).
--   Para posting contable y emisión fiscal coherentes, la invoice debe
--   referenciar el issuer (organización dueña de la membresía).
--
-- Cambios:
--   1. ALTER TABLE membership_invoices ADD COLUMN issuer_id (nullable inicialmente
--      para no romper filas existentes; backfill manual antes de agregar NOT NULL).
--   2. Índice en membership_invoices(issuer_id).
--   3. Actualización de post_payment_to_journal: memberships ahora infieren
--      tenant_actor_id vía membership_invoices.issuer_id → issuers.tenant_actor_id.
--
-- Backfill (manual, antes de agregar NOT NULL):
--   Si opera con un único issuer activo por tenant, ejecutar el siguiente script
--   de backfill ANTES de aplicar un constraint NOT NULL en una migración futura:
--
--   UPDATE membership_invoices mi
--      SET issuer_id = (
--          SELECT i.id
--          FROM   issuers i
--          WHERE  i.is_active = TRUE
--          LIMIT  1
--      )
--    WHERE mi.issuer_id IS NULL;
--
--   En entornos multi-issuer, la asignación debe ser explícita según la
--   organización dueña del plan de membresía.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Columna issuer_id en membership_invoices
-- -----------------------------------------------------------------------------
ALTER TABLE membership_invoices
    ADD COLUMN IF NOT EXISTS issuer_id UUID
        REFERENCES issuers(id) ON DELETE RESTRICT;

COMMENT ON COLUMN membership_invoices.issuer_id
    IS 'Organización emisora de la factura de membresía (FK a issuers.id). '
       'Determina el tenant para posting contable y emisión fiscal. '
       'Nullable inicialmente para compatibilidad con datos existentes; '
       'debe poblarse al crear nuevas invoices. '
       'Ver docs/FISCAL_MULTI_ISSUER.md para guía de backfill de datos legados.';

-- -----------------------------------------------------------------------------
-- 2) Índice en membership_invoices.issuer_id
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_membership_invoices_issuer_id
    ON membership_invoices (issuer_id);

-- -----------------------------------------------------------------------------
-- 3) Actualizar post_payment_to_journal para soportar memberships vía issuer_id
--
--    Ahora que membership_invoices.issuer_id existe, la inferencia de tenant
--    para memberships usa: membership_invoices.issuer_id → issuers.tenant_actor_id
--
--    Si issuer_id es NULL en la invoice: falla con mensaje accionable.
-- -----------------------------------------------------------------------------
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
    v_invoice_id        UUID;
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

    -- -------------------------------------------------------------------------
    -- Inferir tenant_actor_id = seller/issuer (NUNCA buyer/cliente/donante)
    -- -------------------------------------------------------------------------

    -- Intento 1: Marketplace → seller único desde marketplace_order_items
    SELECT COUNT(DISTINCT moi.seller_id),
           MIN(moi.seller_id)
    INTO   v_seller_count,
           v_tenant_actor_id
    FROM   marketplace_orders o
    JOIN   marketplace_order_items moi ON moi.order_id = o.id
    WHERE  o.payment_id = p_payment_id;

    IF v_seller_count > 1 THEN
        RAISE EXCEPTION
            'El pago % corresponde a una orden multi-vendedor (% sellers distintos). '
            'El posting contable para órdenes multi-vendor requiere split por seller o '
            'llamadas individuales a post_payment_to_journal por seller.',
            p_payment_id, v_seller_count;
    END IF;

    -- Intento 2: Memberships → issuer_id → issuers.tenant_actor_id
    IF v_tenant_actor_id IS NULL THEN
        SELECT mi.id, i.tenant_actor_id
        INTO   v_invoice_id, v_tenant_actor_id
        FROM   membership_invoices mi
        JOIN   issuers i ON i.id = mi.issuer_id
        WHERE  mi.payment_id = p_payment_id
        LIMIT  1;

        -- Si existe la invoice pero issuer_id es NULL: fallar con mensaje accionable
        IF v_tenant_actor_id IS NULL AND EXISTS (
            SELECT 1 FROM membership_invoices mi
            WHERE mi.payment_id = p_payment_id
        ) THEN
            RAISE EXCEPTION
                'El pago % está vinculado a una membership_invoice pero issuer_id es NULL. '
                'Asigne membership_invoices.issuer_id al crear la invoice, o ejecute el '
                'backfill documentado en docs/FISCAL_MULTI_ISSUER.md (sección G) para '
                'poblar invoices existentes.',
                p_payment_id;
        END IF;
    END IF;

    -- Intento 3: Donations — NO se puede inferir tenant desde donor_actor_id.
    IF v_tenant_actor_id IS NULL THEN
        IF EXISTS (
            SELECT 1 FROM donations d
            WHERE d.payment_id = p_payment_id
        ) THEN
            RAISE EXCEPTION
                'El pago % está vinculado a una donación pero no se puede inferir '
                'el tenant/issuer porque donations.donor_actor_id es el donante, '
                'no la organización receptora. '
                'Solución: agregue donations.recipient_actor_id o donations.issuer_id '
                'para identificar el tenant receptor.',
                p_payment_id;
        END IF;
    END IF;

    -- Modo seguro: si no se pudo inferir el tenant, fallar explícitamente
    IF v_tenant_actor_id IS NULL THEN
        RAISE EXCEPTION
            'No se pudo inferir tenant_actor_id para el pago %: no está vinculado a ninguna '
            'marketplace_order, membership_invoice ni donation conocida.',
            p_payment_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Obtener mapeo contable y crear asiento
    -- -------------------------------------------------------------------------

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
       'Infiere tenant_actor_id = seller/issuer (NUNCA buyer/cliente/donante). '
       'Marketplace: seller único vía order_items; multi-seller falla con excepción. '
       'Memberships: tenant vía membership_invoices.issuer_id → issuers.tenant_actor_id; '
       '  falla si issuer_id es NULL (requiere poblar el campo al crear la invoice). '
       'Donations: falla hasta que donations.recipient_actor_id esté disponible. '
       'Idempotente, concurrencia segura, requiere rol operador o superior.';
