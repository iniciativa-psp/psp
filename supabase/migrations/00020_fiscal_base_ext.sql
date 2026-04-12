-- =============================================================================
-- Fiscal Base Extension – SIG-PSP
-- Migración incremental sobre 00017_fiscal_base.sql
-- Agrega: tax_id_type / tax_id_value para identificación cédula/pasaporte,
-- constraints de coherencia, índice compuesto, y tenant_actor_id multi-tenant.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ampliar actor_tax_profiles: identificación fiscal genérica
-- Mantiene ruc / ruc_dv como columnas legacy; agrega tax_id_type y tax_id_value
-- como forma canónica para cualquier tipo de identificación fiscal.
-- -----------------------------------------------------------------------------
ALTER TABLE actor_tax_profiles
    ADD COLUMN IF NOT EXISTS tax_id_type  TEXT,
    ADD COLUMN IF NOT EXISTS tax_id_value TEXT;

-- Restricción de dominio: solo valores permitidos
ALTER TABLE actor_tax_profiles
    DROP CONSTRAINT IF EXISTS atp_tax_id_type_check;

ALTER TABLE actor_tax_profiles
    ADD CONSTRAINT atp_tax_id_type_check
        CHECK (tax_id_type IS NULL OR tax_id_type IN ('ruc_dv', 'cedula', 'pasaporte'));

-- Coherencia entre tax_id_type y columnas legacy ruc/ruc_dv:
--   • Si tax_id_type = 'ruc_dv' → tax_id_value debe ser igual al ruc y ruc_dv no null.
--   • Si tax_id_type en ('cedula','pasaporte') → ruc debe ser null y ruc_dv debe ser null.
ALTER TABLE actor_tax_profiles
    DROP CONSTRAINT IF EXISTS atp_tax_id_consistency;

ALTER TABLE actor_tax_profiles
    ADD CONSTRAINT atp_tax_id_consistency CHECK (
        tax_id_type IS NULL
        OR (
            tax_id_type = 'ruc_dv'
            AND tax_id_value IS NOT NULL
            AND ruc IS NOT NULL
            AND ruc_dv IS NOT NULL
            AND tax_id_value = ruc
        )
        OR (
            tax_id_type IN ('cedula', 'pasaporte')
            AND tax_id_value IS NOT NULL
            AND ruc    IS NULL
            AND ruc_dv IS NULL
        )
    );

-- Índice compuesto para búsquedas por tipo + valor de identificación
CREATE INDEX IF NOT EXISTS idx_atp_tax_id
    ON actor_tax_profiles (tax_id_type, tax_id_value)
    WHERE tax_id_type IS NOT NULL AND tax_id_value IS NOT NULL;

COMMENT ON COLUMN actor_tax_profiles.tax_id_type
    IS 'Tipo de identificación fiscal: ruc_dv (Panamá), cedula o pasaporte. Legacy: columnas ruc/ruc_dv.';
COMMENT ON COLUMN actor_tax_profiles.tax_id_value
    IS 'Valor de la identificación fiscal según tax_id_type (RUC, número de cédula o pasaporte).';

-- -----------------------------------------------------------------------------
-- Agregar tenant_actor_id a tablas fiscales base (nullable para compat.)
-- -----------------------------------------------------------------------------
ALTER TABLE actor_tax_profiles
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

ALTER TABLE issuers
    ADD COLUMN IF NOT EXISTS tenant_actor_id UUID REFERENCES actors (id) ON DELETE RESTRICT;

-- Índices para filtrado eficiente por tenant
CREATE INDEX IF NOT EXISTS idx_atp_tenant
    ON actor_tax_profiles (tenant_actor_id)
    WHERE tenant_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issuers_tenant
    ON issuers (tenant_actor_id)
    WHERE tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Unicidad por tenant
-- -----------------------------------------------------------------------------

-- actor_tax_profiles: un perfil fiscal por actor dentro del tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_atp_tenant_actor
    ON actor_tax_profiles (tenant_actor_id, actor_id)
    WHERE tenant_actor_id IS NOT NULL;

-- issuers: un emisor activo por tenant (reemplaza el índice global por actor)
-- El índice global uq_issuers_actor_active sigue vigente para filas sin tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_issuers_tenant_active
    ON issuers (tenant_actor_id)
    WHERE is_active = TRUE AND tenant_actor_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Actualizar RLS de tablas fiscales base: admin bypass + membresía de tenant
-- Se reemplazan las políticas de 00017_fiscal_base.sql.
-- -----------------------------------------------------------------------------

-- actor_tax_profiles
DROP POLICY IF EXISTS "atp_select" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_insert" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_update" ON actor_tax_profiles;
DROP POLICY IF EXISTS "atp_delete" ON actor_tax_profiles;

CREATE POLICY "atp_select"
    ON actor_tax_profiles FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "atp_insert"
    ON actor_tax_profiles FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "atp_update"
    ON actor_tax_profiles FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "atp_delete"
    ON actor_tax_profiles FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );

-- issuers
DROP POLICY IF EXISTS "issuers_select" ON issuers;
DROP POLICY IF EXISTS "issuers_insert" ON issuers;
DROP POLICY IF EXISTS "issuers_update" ON issuers;
DROP POLICY IF EXISTS "issuers_delete" ON issuers;

CREATE POLICY "issuers_select"
    ON issuers FOR SELECT
    USING (
        has_role('admin')
        OR has_role('auditor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor']))
        OR tenant_actor_id IS NULL
    );

CREATE POLICY "issuers_insert"
    ON issuers FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "issuers_update"
    ON issuers FOR UPDATE
    USING (
        has_role('admin')
        OR has_role('gestor')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor']))
    );

CREATE POLICY "issuers_delete"
    ON issuers FOR DELETE
    USING (
        has_role('admin')
        OR (tenant_actor_id IS NOT NULL AND is_tenant_member(tenant_actor_id, ARRAY['owner','admin']))
    );
