-- =============================================================================
-- Módulo Fiscal Base – SIG-PSP
-- Perfiles fiscales de actores y emisores de comprobantes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfiles fiscales de actores (actor_tax_profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actor_tax_profiles (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_id        UUID            NOT NULL REFERENCES actors (id) ON DELETE CASCADE,
    -- RUC y dígito verificador (Panamá)
    ruc             VARCHAR(30),
    ruc_dv          VARCHAR(5),
    -- Tipo de contribuyente
    taxpayer_type   VARCHAR(30),
    -- Nombre/razón social fiscal
    fiscal_name     VARCHAR(255),
    -- Dirección fiscal
    fiscal_address  TEXT,
    -- Régimen fiscal (general, especial, exento, etc.)
    tax_regime      VARCHAR(50)     DEFAULT 'general',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT atp_pkey             PRIMARY KEY (id),
    CONSTRAINT atp_actor_unique     UNIQUE (actor_id),
    -- Si se registra RUC con DV, el DV no puede ser vacío
    CONSTRAINT atp_ruc_dv_check     CHECK (
        ruc IS NULL
        OR (ruc_dv IS NOT NULL AND ruc_dv <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_atp_actor    ON actor_tax_profiles (actor_id);
CREATE INDEX IF NOT EXISTS idx_atp_ruc      ON actor_tax_profiles (ruc) WHERE ruc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_atp_active   ON actor_tax_profiles (is_active);

CREATE TRIGGER trg_actor_tax_profiles_updated_at
    BEFORE UPDATE ON actor_tax_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE actor_tax_profiles
    IS 'Perfiles fiscales (RUC, régimen, dirección) de actores para facturación electrónica';

-- -----------------------------------------------------------------------------
-- Emisores de comprobantes (issuers)
-- Entidades autorizadas a emitir documentos fiscales electrónicos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS issuers (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_id                UUID            NOT NULL REFERENCES actors (id) ON DELETE RESTRICT,
    issuer_tax_profile_id   UUID            NOT NULL REFERENCES actor_tax_profiles (id) ON DELETE RESTRICT,
    -- Código de sucursal/punto de emisión asignado por la DGI
    branch_code             VARCHAR(20),
    -- Tipo de emisor (facturador_electronico, contribuyente_especial, etc.)
    issuer_type             VARCHAR(50)     DEFAULT 'facturador_electronico',
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT issuers_pkey PRIMARY KEY (id)
);

-- Solo puede haber un emisor activo por actor
CREATE UNIQUE INDEX IF NOT EXISTS uq_issuers_actor_active
    ON issuers (actor_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_issuers_actor            ON issuers (actor_id);
CREATE INDEX IF NOT EXISTS idx_issuers_tax_profile      ON issuers (issuer_tax_profile_id);
CREATE INDEX IF NOT EXISTS idx_issuers_active           ON issuers (is_active);

CREATE TRIGGER trg_issuers_updated_at
    BEFORE UPDATE ON issuers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE issuers
    IS 'Emisores de documentos fiscales electrónicos registrados en el sistema';

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

-- actor_tax_profiles
ALTER TABLE actor_tax_profiles ENABLE ROW LEVEL SECURITY;

-- Lectura: roles internos
-- TODO: cuando exista helper current_actor_id(), agregar OR (actor_id = current_actor_id())
--       para que cada actor pueda leer su propio perfil fiscal.
CREATE POLICY "atp_select"
    ON actor_tax_profiles FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "atp_insert"
    ON actor_tax_profiles FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "atp_update"
    ON actor_tax_profiles FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "atp_delete"
    ON actor_tax_profiles FOR DELETE
    USING (has_role('admin'));

-- issuers
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issuers_select"
    ON issuers FOR SELECT
    USING (has_role('admin') OR has_role('gestor') OR has_role('operador') OR has_role('auditor'));

CREATE POLICY "issuers_insert"
    ON issuers FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('gestor'));

CREATE POLICY "issuers_update"
    ON issuers FOR UPDATE
    USING (has_role('admin') OR has_role('gestor'));

CREATE POLICY "issuers_delete"
    ON issuers FOR DELETE
    USING (has_role('admin'));
