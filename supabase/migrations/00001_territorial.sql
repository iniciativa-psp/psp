-- =============================================================================
-- Módulo Territorial – SIG-PSP
-- División Político-Administrativa de la República de Panamá
--
-- Migrado desde el plugin WordPress psp-territorial-v2.
-- Referencia: https://github.com/pobrezapanama/Territorial
-- =============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Tabla principal de unidades territoriales
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territorial_items (
    id         BIGINT       NOT NULL,
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(255) NOT NULL DEFAULT '',
    code       VARCHAR(50)  NOT NULL DEFAULT '',
    type       VARCHAR(20)  NOT NULL,
    parent_id  BIGINT                DEFAULT NULL,
    level      SMALLINT     NOT NULL DEFAULT 1,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT territorial_items_pkey       PRIMARY KEY (id),
    CONSTRAINT territorial_items_type_check CHECK (
        type IN ('province', 'district', 'corregimiento', 'community')
    ),
    CONSTRAINT territorial_items_parent_fk  FOREIGN KEY (parent_id)
        REFERENCES territorial_items (id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_territorial_slug      ON territorial_items (slug);
CREATE INDEX IF NOT EXISTS idx_territorial_code      ON territorial_items (code);
CREATE INDEX IF NOT EXISTS idx_territorial_type      ON territorial_items (type);
CREATE INDEX IF NOT EXISTS idx_territorial_parent_id ON territorial_items (parent_id);
CREATE INDEX IF NOT EXISTS idx_territorial_level     ON territorial_items (level);
CREATE INDEX IF NOT EXISTS idx_territorial_is_active ON territorial_items (is_active);
CREATE INDEX IF NOT EXISTS idx_territorial_name_trgm ON territorial_items USING gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Función auxiliar: actualizar updated_at automáticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_territorial_updated_at
    BEFORE UPDATE ON territorial_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Vistas de conveniencia
-- -----------------------------------------------------------------------------

-- Provincias
CREATE OR REPLACE VIEW v_provincias AS
SELECT id, name, slug, code, is_active
FROM territorial_items
WHERE type = 'province' AND is_active = TRUE
ORDER BY name;

-- Distritos (con nombre de provincia)
CREATE OR REPLACE VIEW v_distritos AS
SELECT
    d.id, d.name, d.slug, d.code,
    p.id   AS province_id,
    p.name AS province_name,
    d.is_active
FROM territorial_items d
JOIN territorial_items p ON p.id = d.parent_id
WHERE d.type = 'district' AND d.is_active = TRUE
ORDER BY p.name, d.name;

-- Corregimientos (con jerarquía completa)
CREATE OR REPLACE VIEW v_corregimientos AS
SELECT
    c.id, c.name, c.slug, c.code,
    d.id   AS district_id,
    d.name AS district_name,
    p.id   AS province_id,
    p.name AS province_name,
    c.is_active
FROM territorial_items c
JOIN territorial_items d ON d.id = c.parent_id
JOIN territorial_items p ON p.id = d.parent_id
WHERE c.type = 'corregimiento' AND c.is_active = TRUE
ORDER BY p.name, d.name, c.name;

-- -----------------------------------------------------------------------------
-- Función de búsqueda territorial
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_territorial(
    p_query TEXT,
    p_type  TEXT    DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id        BIGINT,
    name      VARCHAR,
    slug      VARCHAR,
    code      VARCHAR,
    type      VARCHAR,
    parent_id BIGINT,
    level     SMALLINT
)
LANGUAGE sql STABLE AS $$
SELECT
    id, name, slug, code, type, parent_id, level
FROM territorial_items
WHERE
    is_active = TRUE
    AND (p_type IS NULL OR type = p_type)
    AND (
        name ILIKE '%' || p_query || '%'
        OR slug ILIKE '%' || p_query || '%'
        OR code ILIKE '%' || p_query || '%'
    )
ORDER BY
    CASE type
        WHEN 'province'      THEN 1
        WHEN 'district'      THEN 2
        WHEN 'corregimiento' THEN 3
        WHEN 'community'     THEN 4
    END,
    name
LIMIT p_limit;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security (solo lectura pública; escritura requiere service role)
-- -----------------------------------------------------------------------------
ALTER TABLE territorial_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territorial_public_read"
    ON territorial_items FOR SELECT
    USING (TRUE);

-- -----------------------------------------------------------------------------
-- Comentarios de tabla/columnas
-- -----------------------------------------------------------------------------
COMMENT ON TABLE  territorial_items           IS 'División Político-Administrativa de la República de Panamá';
COMMENT ON COLUMN territorial_items.id        IS 'ID explícito de la jerarquía territorial (sin autoincremento)';
COMMENT ON COLUMN territorial_items.type      IS 'Nivel: province | district | corregimiento | community';
COMMENT ON COLUMN territorial_items.parent_id IS 'ID del nivel jerárquico superior (NULL para provincias)';
COMMENT ON COLUMN territorial_items.level     IS '1=provincia, 2=distrito, 3=corregimiento, 4=comunidad';
