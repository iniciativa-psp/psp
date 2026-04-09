-- =============================================================================
-- Fase 1 – Módulo Actores / CRM
-- Personas naturales, hogares, empresas, organizaciones y sus relaciones
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE actor_type AS ENUM (
    'persona_natural',
    'hogar',
    'empresa',
    'cooperativa',
    'ong',
    'institucion_publica',
    'agrupacion',
    'organismo_internacional',
    'medio_comunicacion'
);

CREATE TYPE actor_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_verification'
);

-- -----------------------------------------------------------------------------
-- Tabla principal: actors
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS actors (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_type          actor_type      NOT NULL,
    full_name           VARCHAR(255)    NOT NULL,
    legal_name          VARCHAR(255),
    id_number           VARCHAR(50),
    ruc                 VARCHAR(50),
    email               VARCHAR(255),
    phone               VARCHAR(30),
    whatsapp            VARCHAR(30),
    website             TEXT,
    territorial_id      BIGINT          REFERENCES territorial_items(id) ON DELETE SET NULL,
    address             TEXT,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,

    -- Datos socioeconómicos (persona natural / hogar)
    income_monthly      NUMERIC(14, 2),
    dependents          SMALLINT,
    education_level     VARCHAR(50),
    vulnerable_groups   TEXT[],

    -- Datos de clasificación estratégica
    strategic_sectors   TEXT[],
    economic_agents     TEXT[],

    -- Indicadores calculados
    social_score        NUMERIC(5, 2),
    risk_score          NUMERIC(5, 2),

    -- Multimedia
    logo_url            TEXT,
    avatar_url          TEXT,

    -- Estado y metadatos
    status              actor_status    NOT NULL DEFAULT 'pending_verification',
    notes               TEXT,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by          UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT actors_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_actors_actor_type      ON actors (actor_type);
CREATE INDEX IF NOT EXISTS idx_actors_status          ON actors (status);
CREATE INDEX IF NOT EXISTS idx_actors_territorial_id  ON actors (territorial_id);
CREATE INDEX IF NOT EXISTS idx_actors_is_active       ON actors (is_active);
CREATE INDEX IF NOT EXISTS idx_actors_created_by      ON actors (created_by);
CREATE INDEX IF NOT EXISTS idx_actors_id_number       ON actors (id_number);
CREATE INDEX IF NOT EXISTS idx_actors_ruc             ON actors (ruc);

CREATE TRIGGER trg_actors_updated_at
    BEFORE UPDATE ON actors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE actors IS 'Actores del ecosistema SIG-PSP: personas, hogares, empresas y organizaciones';

-- -----------------------------------------------------------------------------
-- Tabla: actor_relationships
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS actor_relationships (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    parent_actor_id     UUID            NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    child_actor_id      UUID            NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50)     NOT NULL,
    position            VARCHAR(100),
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT actor_relationships_pkey        PRIMARY KEY (id),
    CONSTRAINT actor_relationships_unique      UNIQUE (parent_actor_id, child_actor_id, relationship_type),
    CONSTRAINT actor_relationships_no_self     CHECK (parent_actor_id <> child_actor_id)
);

CREATE INDEX IF NOT EXISTS idx_actor_rel_parent ON actor_relationships (parent_actor_id);
CREATE INDEX IF NOT EXISTS idx_actor_rel_child  ON actor_relationships (child_actor_id);

CREATE TRIGGER trg_actor_relationships_updated_at
    BEFORE UPDATE ON actor_relationships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE actor_relationships IS 'Relaciones entre actores (jerarquía, asociación, membresía, etc.)';

-- -----------------------------------------------------------------------------
-- Extender profiles: agregar actor_id
-- -----------------------------------------------------------------------------

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES actors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_actor_id ON profiles (actor_id);

-- -----------------------------------------------------------------------------
-- Vista: v_actors_summary
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_actors_summary AS
SELECT
    a.id,
    a.actor_type,
    a.full_name,
    a.legal_name,
    a.id_number,
    a.ruc,
    a.email,
    a.phone,
    a.whatsapp,
    a.website,
    a.territorial_id,
    t.name     AS territorial_name,
    t.type     AS territorial_type,
    a.address,
    a.income_monthly,
    a.dependents,
    a.education_level,
    a.vulnerable_groups,
    a.strategic_sectors,
    a.economic_agents,
    a.social_score,
    a.risk_score,
    a.logo_url,
    a.avatar_url,
    a.status,
    a.notes,
    a.is_active,
    a.created_by,
    a.created_at,
    a.updated_at
FROM actors a
LEFT JOIN territorial_items t ON t.id = a.territorial_id;

-- -----------------------------------------------------------------------------
-- Función: search_actors
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_actors(
    p_query        TEXT    DEFAULT NULL,
    p_actor_type   TEXT    DEFAULT NULL,
    p_economic_agent TEXT  DEFAULT NULL,
    p_limit        INTEGER DEFAULT 20
)
RETURNS SETOF v_actors_summary
LANGUAGE sql STABLE AS $$
SELECT *
FROM v_actors_summary
WHERE
    is_active = TRUE
    AND (p_actor_type IS NULL OR actor_type::TEXT = p_actor_type)
    AND (p_economic_agent IS NULL OR economic_agents @> ARRAY[p_economic_agent])
    AND (
        p_query IS NULL
        OR full_name  ILIKE '%' || p_query || '%'
        OR legal_name ILIKE '%' || p_query || '%'
        OR id_number  ILIKE '%' || p_query || '%'
        OR ruc        ILIKE '%' || p_query || '%'
        OR email      ILIKE '%' || p_query || '%'
    )
ORDER BY full_name
LIMIT p_limit;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE actors ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer actores activos
CREATE POLICY "actors_read_authenticated"
    ON actors FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Operador o superior puede insertar/actualizar
CREATE POLICY "actors_write_operador"
    ON actors FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "actors_update_operador"
    ON actors FOR UPDATE
    USING (has_role('operador'));

-- Solo admin puede eliminar
CREATE POLICY "actors_delete_admin"
    ON actors FOR DELETE
    USING (has_role('admin'));

ALTER TABLE actor_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actor_rel_read_authenticated"
    ON actor_relationships FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "actor_rel_write_operador"
    ON actor_relationships FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "actor_rel_update_operador"
    ON actor_relationships FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "actor_rel_delete_admin"
    ON actor_relationships FOR DELETE
    USING (has_role('admin'));
