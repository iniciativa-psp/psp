-- =============================================================================
-- Fase 1 – Expansión Territorial
-- Agrega geometría PostGIS, jerarquías extendidas y vistas de comunidad/barrio
-- =============================================================================

-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- Extender territorial_items con nuevas columnas
-- -----------------------------------------------------------------------------

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS urban_rural VARCHAR(10) DEFAULT 'urban'
        CHECK (urban_rural IN ('urban', 'rural', 'mixed'));

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS population INTEGER DEFAULT 0;

ALTER TABLE territorial_items
    ADD COLUMN IF NOT EXISTS area_km2 NUMERIC(12, 2);

-- -----------------------------------------------------------------------------
-- Actualizar restricción de tipo: agregar 'country', 'barrio'
-- -----------------------------------------------------------------------------

ALTER TABLE territorial_items
    DROP CONSTRAINT IF EXISTS territorial_items_type_check;

ALTER TABLE territorial_items
    ADD CONSTRAINT territorial_items_type_check CHECK (
        type IN ('country', 'province', 'district', 'corregimiento', 'community', 'barrio')
    );

-- -----------------------------------------------------------------------------
-- Índice espacial sobre geom
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_territorial_geom
    ON territorial_items USING GIST (geom);

-- -----------------------------------------------------------------------------
-- Trigger: auto-calcular geom a partir de lat/lon
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION territorial_set_geom()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_territorial_set_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON territorial_items
    FOR EACH ROW EXECUTE FUNCTION territorial_set_geom();

-- -----------------------------------------------------------------------------
-- Vista: v_comunidades (comunidades con jerarquía completa)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_comunidades AS
SELECT
    c.id,
    c.name,
    c.slug,
    c.code,
    c.urban_rural,
    c.population,
    c.area_km2,
    c.latitude,
    c.longitude,
    cor.id   AS corregimiento_id,
    cor.name AS corregimiento_name,
    d.id     AS district_id,
    d.name   AS district_name,
    p.id     AS province_id,
    p.name   AS province_name,
    c.is_active
FROM territorial_items c
JOIN territorial_items cor ON cor.id = c.parent_id
JOIN territorial_items d   ON d.id   = cor.parent_id
JOIN territorial_items p   ON p.id   = d.parent_id
WHERE c.type = 'community' AND c.is_active = TRUE
ORDER BY p.name, d.name, cor.name, c.name;

-- -----------------------------------------------------------------------------
-- Vista: v_barrios (barrios con jerarquía completa)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_barrios AS
SELECT
    b.id,
    b.name,
    b.slug,
    b.code,
    b.urban_rural,
    b.population,
    b.area_km2,
    b.latitude,
    b.longitude,
    c.id     AS community_id,
    c.name   AS community_name,
    cor.id   AS corregimiento_id,
    cor.name AS corregimiento_name,
    d.id     AS district_id,
    d.name   AS district_name,
    p.id     AS province_id,
    p.name   AS province_name,
    b.is_active
FROM territorial_items b
JOIN territorial_items c   ON c.id   = b.parent_id
JOIN territorial_items cor ON cor.id = c.parent_id
JOIN territorial_items d   ON d.id   = cor.parent_id
JOIN territorial_items p   ON p.id   = d.parent_id
WHERE b.type = 'barrio' AND b.is_active = TRUE
ORDER BY p.name, d.name, cor.name, c.name, b.name;

-- -----------------------------------------------------------------------------
-- Función: get_territorial_path(item_id) — retorna ancestros del ítem (CTE recursivo)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_territorial_path(item_id BIGINT)
RETURNS TABLE (
    id       BIGINT,
    name     VARCHAR,
    type     VARCHAR,
    level    SMALLINT,
    parent_id BIGINT
)
LANGUAGE sql STABLE AS $$
WITH RECURSIVE path AS (
    SELECT t.id, t.name, t.type, t.level, t.parent_id
    FROM territorial_items t
    WHERE t.id = item_id

    UNION ALL

    SELECT t.id, t.name, t.type, t.level, t.parent_id
    FROM territorial_items t
    JOIN path p ON t.id = p.parent_id
)
SELECT id, name, type, level, parent_id
FROM path
ORDER BY level;
$$;

-- -----------------------------------------------------------------------------
-- Función: get_territorial_children(parent_item_id) — retorna hijos directos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_territorial_children(parent_item_id BIGINT)
RETURNS TABLE (
    id        BIGINT,
    name      VARCHAR,
    type      VARCHAR,
    level     SMALLINT,
    is_active BOOLEAN
)
LANGUAGE sql STABLE AS $$
SELECT id, name, type, level, is_active
FROM territorial_items
WHERE parent_id = parent_item_id
ORDER BY name;
$$;

-- -----------------------------------------------------------------------------
-- Comentarios de columnas nuevas
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN territorial_items.urban_rural IS 'Clasificación: urban | rural | mixed';
COMMENT ON COLUMN territorial_items.latitude    IS 'Latitud geográfica (WGS-84)';
COMMENT ON COLUMN territorial_items.longitude   IS 'Longitud geográfica (WGS-84)';
COMMENT ON COLUMN territorial_items.geom        IS 'Geometría Point PostGIS (SRID 4326) calculada automáticamente';
COMMENT ON COLUMN territorial_items.population  IS 'Población estimada';
COMMENT ON COLUMN territorial_items.area_km2    IS 'Área en kilómetros cuadrados';
