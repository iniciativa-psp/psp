-- =============================================================================
-- 00023_fix_post_payment_tenant_inference.sql
--
-- Corrige la inferencia de tenant_actor_id en post_payment_to_journal:
--
--   ANTES (00022): usaba buyer_id / memberships.actor_id / donor_actor_id
--                  (cliente, NO issuer/seller → asiento contable en el tenant incorrecto)
--
--   AHORA (00023):
--     • Marketplace → seller único (via marketplace_order_items.seller_id)
--       Si hay más de un seller → RAISE EXCEPTION (requiere split o posting por seller)
--     • Memberships → RAISE EXCEPTION
--       (memberships.actor_id es el miembro/cliente; falta issuer_id — ver 00024)
--     • Donations   → RAISE EXCEPTION
--       (donor_actor_id es el donante, no el tenant receptor)
--
-- NOTA: NO modifica 00022_multi_tenant_rls_lockdown.sql.
--       Las RLS policies quedan intactas.
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

    -- Intento 2: Memberships — NO se puede inferir tenant con el esquema actual.
    -- memberships.actor_id es el miembro/cliente, no el issuer/organización emisora.
    -- Ver migración 00024 para la solución: membership_invoices.issuer_id.
    IF v_tenant_actor_id IS NULL THEN
        IF EXISTS (
            SELECT 1 FROM membership_invoices mi
            WHERE mi.payment_id = p_payment_id
        ) THEN
            RAISE EXCEPTION
                'El pago % está vinculado a una membership_invoice pero no se puede inferir '
                'el tenant/issuer porque memberships.actor_id representa al miembro/cliente, '
                'no a la organización emisora. '
                'Solución: agregue membership_invoices.issuer_id (ver migración 00024) y '
                'asegúrese de poblar ese campo al crear la invoice.',
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
       'Memberships: falla hasta que membership_invoices.issuer_id esté disponible (ver 00024). '
       'Donations: falla hasta que donations.recipient_actor_id esté disponible. '
       'Idempotente, concurrencia segura, requiere rol operador o superior.';
