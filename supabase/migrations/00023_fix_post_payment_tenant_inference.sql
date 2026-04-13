-- =============================================================================
-- 00023_fix_post_payment_tenant_inference.sql
--
-- Corrige la inferencia de tenant_actor_id en post_payment_to_journal.
--
-- Problema en 00022: la función asignaba tenant_actor_id al buyer/cliente/donor,
-- en lugar del seller/issuer (organización que emite).
--
-- Regla de negocio confirmada:
--   tenant_actor_id = seller / issuer (organización que emite la factura/servicio).
--
-- Nuevo comportamiento:
--   • Marketplace single-seller: tenant = seller_id (único) de marketplace_order_items.
--   • Marketplace multi-seller:  RAISE EXCEPTION (requiere split de asiento).
--   • Memberships:               RAISE EXCEPTION (memberships.actor_id es el miembro/
--                                cliente, no el issuer; falta modelar issuer/tenant).
--   • Donations:                 RAISE EXCEPTION (donor_actor_id es el donante, no el
--                                recipient/issuer/tenant; falta modelar recipient).
--   • Sin fuente reconocida:     RAISE EXCEPTION.
--
-- Prerequisito de aplicación manual:
--   Aplicar 00025_add_payment_id_to_sources.sql ANTES de ejecutar
--   post_payment_to_journal con cualquier pago vinculado por payment_id.
--
-- No modifica tablas, índices ni políticas RLS.
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
        RAISE EXCEPTION
            'Permiso insuficiente para registrar asiento contable. '
            'Se requiere rol operador o superior.';
    END IF;

    -- Obtener datos del pago confirmado
    SELECT p.id, p.amount, p.concept_id, p.created_by
    INTO   v_payment
    FROM   payments p
    WHERE  p.id     = p_payment_id
      AND  p.status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Pago % no encontrado o no está en estado completed', p_payment_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Inferir tenant_actor_id = seller/issuer (organización que emite)
    --
    -- Fuente 1: Marketplace — tenant es el seller (único) del pedido
    -- -------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM marketplace_orders WHERE payment_id = p_payment_id
    ) THEN
        SELECT COUNT(DISTINCT moi.seller_id)
        INTO   v_seller_count
        FROM   marketplace_orders mo
        JOIN   marketplace_order_items moi ON moi.order_id = mo.id
        WHERE  mo.payment_id = p_payment_id;

        IF v_seller_count = 1 THEN
            SELECT MIN(moi.seller_id)
            INTO   v_tenant_actor_id
            FROM   marketplace_orders mo
            JOIN   marketplace_order_items moi ON moi.order_id = mo.id
            WHERE  mo.payment_id = p_payment_id;
        ELSE
            RAISE EXCEPTION
                'El pago % corresponde a un pedido marketplace con % vendedores distintos. '
                'Un asiento multi-vendedor requiere partición (split) de asiento; '
                'inferencia automática de tenant no es posible.',
                p_payment_id, v_seller_count;
        END IF;

    -- -------------------------------------------------------------------------
    -- Fuente 2: Membresías — actor_id es el miembro/cliente, NO el issuer/tenant
    -- -------------------------------------------------------------------------
    ELSIF EXISTS (
        SELECT 1 FROM membership_invoices WHERE payment_id = p_payment_id
    ) THEN
        RAISE EXCEPTION
            'El pago % está vinculado a una membership_invoice. '
            'memberships.actor_id representa al miembro/cliente, no al issuer/tenant. '
            'Falta modelar el issuer o tenant explícito para membresías antes de '
            'poder registrar el asiento contable automáticamente.',
            p_payment_id;

    -- -------------------------------------------------------------------------
    -- Fuente 3: Donaciones — donor_actor_id es el donante, NO el recipient/tenant
    -- -------------------------------------------------------------------------
    ELSIF EXISTS (
        SELECT 1 FROM donations WHERE payment_id = p_payment_id
    ) THEN
        RAISE EXCEPTION
            'El pago % está vinculado a una donación. '
            'donations.donor_actor_id representa al donante, no al recipient/issuer/tenant. '
            'Falta modelar el recipient o tenant explícito para donaciones antes de '
            'poder registrar el asiento contable automáticamente.',
            p_payment_id;

    -- -------------------------------------------------------------------------
    -- Sin fuente reconocida
    -- -------------------------------------------------------------------------
    ELSE
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
        RAISE EXCEPTION
            'No existe mapeo contable para el concepto %', v_payment.concept_id;
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
       'Infiere tenant_actor_id = seller/issuer (organización que emite). '
       'Marketplace single-seller: OK. Multi-seller, membresías y donaciones fallan '
       'explícitamente hasta que se modele el issuer/tenant en esas fuentes. '
       'Idempotente, concurrencia segura, requiere rol operador o superior. '
       'Prerequisito: 00025_add_payment_id_to_sources.sql debe estar aplicado.';
