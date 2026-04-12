-- =============================================================================
-- Accounting Hardening – SIG-PSP
-- Migración incremental sobre 00016_accounting.sql
-- Agrega: multi-tenant (actor_memberships + tenant_actor_id), hardening de
-- funciones SECURITY DEFINER, manejo de unique_violation y check de rol.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- actor_memberships: pertenencia de usuarios (profiles) a tenants (actores)
-- Permite aislamiento multi-tenant real con roles por tenant.
-- has_role('admin') conserva bypass global (superadmin de soporte).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actor_memberships (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_actor_id UUID        NOT NULL REFERENCES actors (id) ON DELETE CASCADE,
    profile_id      UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    role            TEXT        NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT actmem_pkey              PRIMARY KEY (id),
    CONSTRAINT actmem_tenant_profile_uq UNIQUE (tenant_actor_id, profile_id),
    CONSTRAINT actmem_role_check        CHECK (role IN ('owner','admin','gestor','operador','auditor'))
);

CREATE INDEX IF NOT EXISTS idx_actmem_tenant   ON actor_memberships (tenant_actor_id);
CREATE INDEX IF NOT EXISTS idx_actmem_profile  ON actor_memberships (profile_id);
CREATE INDEX IF NOT EXISTS idx_actmem_active   ON actor_memberships (is_active);

CREATE TRIGGER trg_actor_memberships_updated_at
    BEFORE UPDATE ON actor_memberships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE actor_memberships
    IS 'Pertenencia de usuarios (profiles) a tenants (actores organización) con roles por tenant';

-- -----------------------------------------------------------------------------
-- Helper SECURITY DEFINER para verificar membresía sin recursión en RLS
-- Evita recursión cuando las políticas de otras tablas consultan actor_memberships.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_member(
    p_tenant_actor_id UUID,
    p_roles           TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   actor_memberships
        WHERE  tenant_actor_id = p_tenant_actor_id
          AND  profile_id      = auth.uid()
          AND  is_active       = TRUE
          AND  role            = ANY(p_roles)
    );
$$;

COMMENT ON FUNCTION is_tenant_member(UUID, TEXT[])
    IS 'Verifica si el usuario actual es miembro activo del tenant con alguno de los roles indicados. SECURITY DEFINER para evitar recursión en RLS.';

-- -----------------------------------------------------------------------------
-- RLS actor_memberships
-- Cada usuario ve sus propias membresías; admin ve todas.
-- -----------------------------------------------------------------------------
ALTER TABLE actor_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actmem_select"
    ON actor_memberships FOR SELECT
    USING (
        has_role('admin')
        OR profile_id = auth.uid()
    );

CREATE POLICY "actmem_insert"
    ON actor_memberships FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR is_tenant_member(tenant_actor_id, ARRAY['owner','admin'])
    );

CREATE POLICY "actmem_update"
    ON actor_memberships FOR UPDATE
    USING (
        has_role('admin')
        OR is_tenant_member(tenant_actor_id, ARRAY['owner','admin'])
    );

CREATE POLICY "actmem_delete"
    ON actor_memberships FOR DELETE
    USING (has_role('admin'));

-- -----------------------------------------------------------------------------
-- Agregar tenant_actor_id a tablas de contabilidad (nullable para compat.)
-- -----------------------------------------------------------------------------
ALTER TABLE chart_of_accounts
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE journal_entries
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE accounting_mappings
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

-- Índices para filtrado por tenant
CREATE INDEX IF NOT EXISTS idx_coa_tenant   ON chart_of_accounts  (tenant_actor_id) WHERE tenant_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_tenant    ON journal_entries     (tenant_actor_id) WHERE tenant_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_am_tenant    ON accounting_mappings (tenant_actor_id) WHERE tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Unicidad por tenant
-- Los índices globales originales se mantienen para filas sin tenant_actor_id
-- (retrocompatibilidad); los nuevos aplican cuando tenant está asignado.
-- -----------------------------------------------------------------------------

-- chart_of_accounts: código único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_coa_tenant_code
    ON chart_of_accounts (tenant_actor_id, code)
    WHERE tenant_actor_id IS NOT NULL;

-- journal_entries: idempotencia de pago por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_je_tenant_payment
    ON journal_entries (tenant_actor_id, source_id)
    WHERE source_type = 'payment'
      AND source_id       IS NOT NULL
      AND tenant_actor_id IS NOT NULL;

-- accounting_mappings: concepto único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_am_tenant_concept
    ON accounting_mappings (tenant_actor_id, payment_concept_id)
    WHERE tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RPC: post_payment_to_journal (reemplaza la versión de 00016_accounting.sql)
-- Mejoras:
--   1) SET search_path = public (hardening SECURITY DEFINER)
--   2) Check de rol al inicio (admin/gestor/operador)
--   3) Manejo de unique_violation para concurrencia segura
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION post_payment_to_journal(p_payment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment       RECORD;
    v_mapping       RECORD;
    v_entry_id      UUID;
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

    -- Idempotencia: si ya existe asiento para este pago, devolverlo
    SELECT id INTO v_entry_id
    FROM   journal_entries
    WHERE  source_type = 'payment'
      AND  source_id   = p_payment_id;

    IF FOUND THEN
        RETURN v_entry_id;
    END IF;

    -- Crear asiento con manejo de unique_violation (concurrencia)
    BEGIN
        INSERT INTO journal_entries (
            entry_date, description, source_type, source_id,
            status, posted_at, created_by
        ) VALUES (
            CURRENT_DATE,
            'Pago confirmado: ' || p_payment_id::TEXT,
            'payment',
            p_payment_id,
            'posted',
            NOW(),
            v_payment.created_by
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
    IS 'Crea o recupera el asiento contable para un pago confirmado. Idempotente, concurrencia segura, requiere rol operador o superior.';

-- -----------------------------------------------------------------------------
-- Actualizar RLS de tablas contables: admin bypass global + membresía de tenant
-- Se reemplazan las políticas de 00016_accounting.sql.
-- -----------------------------------------------------------------------------

-- chart_of_accounts
DROP POLICY IF EXISTS "coa_select" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_insert" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_update" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_delete" ON chart_of_accounts;

CREATE POLICY "coa_select"
    ON chart_of_accounts FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "coa_insert"
    ON chart_of_accounts FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "coa_update"
    ON chart_of_accounts FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "coa_delete"
    ON chart_of_accounts FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- journal_entries
DROP POLICY IF EXISTS "je_select" ON journal_entries;
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
DROP POLICY IF EXISTS "je_update" ON journal_entries;
DROP POLICY IF EXISTS "je_delete" ON journal_entries;

CREATE POLICY "je_select"
    ON journal_entries FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "je_insert"
    ON journal_entries FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "je_update"
    ON journal_entries FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "je_delete"
    ON journal_entries FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- journal_entry_lines
DROP POLICY IF EXISTS "jel_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "jel_delete" ON journal_entry_lines;

CREATE POLICY "jel_select"
    ON journal_entry_lines FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND (
                  je.tenant_actor_id IS NULL
                  OR is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor'])
              )
        )
    );

CREATE POLICY "jel_insert"
    ON journal_entry_lines FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND (
                  je.tenant_actor_id IS NULL
                  OR is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor'])
              )
        )
    );

CREATE POLICY "jel_update"
    ON journal_entry_lines FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND (
                  je.tenant_actor_id IS NULL
                  OR is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin','gestor'])
              )
        )
    );

CREATE POLICY "jel_delete"
    ON journal_entry_lines FOR DELETE
    USING (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.id = journal_entry_lines.entry_id
              AND (
                  je.tenant_actor_id IS NULL
                  OR is_tenant_member(je.tenant_actor_id, ARRAY['owner','admin'])
              )
        )
    );

-- accounting_mappings
DROP POLICY IF EXISTS "am_select" ON accounting_mappings;
DROP POLICY IF EXISTS "am_insert" ON accounting_mappings;
DROP POLICY IF EXISTS "am_update" ON accounting_mappings;
DROP POLICY IF EXISTS "am_delete" ON accounting_mappings;

CREATE POLICY "am_select"
    ON accounting_mappings FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "am_insert"
    ON accounting_mappings FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "am_update"
    ON accounting_mappings FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "am_delete"
    ON accounting_mappings FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );
