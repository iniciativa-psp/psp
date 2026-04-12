-- =============================================================================
-- PR #30 – Enlazar pagos con fuentes via payment_id
-- Agrega payment_id (FK → payments.id) a marketplace_orders,
-- membership_invoices y donations para trazabilidad fiscal y contable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- marketplace_orders
-- -----------------------------------------------------------------------------
ALTER TABLE marketplace_orders
    ADD COLUMN IF NOT EXISTS payment_id UUID NULL
        REFERENCES payments (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_orders_payment_id
    ON marketplace_orders (payment_id)
    WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_payment_id
    ON marketplace_orders (payment_id);

COMMENT ON COLUMN marketplace_orders.payment_id
    IS 'FK al pago registrado en payments que financia este pedido. Null hasta que se procese el cobro.';

-- -----------------------------------------------------------------------------
-- membership_invoices
-- -----------------------------------------------------------------------------
ALTER TABLE membership_invoices
    ADD COLUMN IF NOT EXISTS payment_id UUID NULL
        REFERENCES payments (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_invoices_payment_id
    ON membership_invoices (payment_id)
    WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_invoices_payment_id
    ON membership_invoices (payment_id);

COMMENT ON COLUMN membership_invoices.payment_id
    IS 'FK al pago registrado en payments que cubre esta factura de membresía. Null hasta que se procese el cobro.';

-- -----------------------------------------------------------------------------
-- donations
-- -----------------------------------------------------------------------------
ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS payment_id UUID NULL
        REFERENCES payments (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donations_payment_id
    ON donations (payment_id)
    WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_payment_id
    ON donations (payment_id);

COMMENT ON COLUMN donations.payment_id
    IS 'FK al pago registrado en payments que respalda esta donación. Null hasta que se confirme el cobro.';

-- -----------------------------------------------------------------------------
-- Backfill (best-effort)
-- Las tres tablas fuente no comparten una columna directa con payments.id en
-- el esquema actual, por lo que el backfill automático no es posible de forma
-- segura.  El procedimiento manual está documentado en docs/PAYMENTS_LINKING.md.
--
-- Si en tu entorno existieran registros enlazables por reference_code, podrías
-- correr algo como (NO ejecutar sin validar primero):
--
-- UPDATE marketplace_orders mo
--    SET payment_id = p.id
--   FROM payments p
--  WHERE p.reference_code = mo.payment_reference
--    AND mo.payment_id IS NULL;
--
-- UPDATE membership_invoices mi
--    SET payment_id = p.id
--   FROM payments p
--  WHERE p.reference_code = mi.invoice_number
--    AND mi.payment_id IS NULL;
--
-- (Para donations no existe columna de referencia homologable; backfill manual.)
-- -----------------------------------------------------------------------------
