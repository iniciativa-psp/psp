-- =============================================================================
-- Fase 2 – Módulo Desarrollo Económico
-- Sectores, agentes económicos, servicios estratégicos y perfiles económicos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: economic_sectors
-- Catálogo de sectores económicos estratégicos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS economic_sectors (
    id              SERIAL          PRIMARY KEY,
    code            VARCHAR(30)     NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    name_short      VARCHAR(100),
    description     TEXT,
    -- 'economia_naranja','economia_verde','economia_azul', etc.
    category        VARCHAR(100),
    icon            VARCHAR(50),
    color           VARCHAR(20),
    is_strategic    BOOLEAN         DEFAULT TRUE,
    is_active       BOOLEAN         DEFAULT TRUE,
    sort_order      SMALLINT        DEFAULT 0,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),

    CONSTRAINT economic_sectors_code_unique UNIQUE (code)
);

COMMENT ON TABLE economic_sectors IS 'Catálogo de sectores económicos estratégicos del sistema PSP';

-- Seed: sectores del documento PSP
INSERT INTO economic_sectors (code, name, name_short, category, is_strategic, sort_order)
VALUES
    ('agricultura',         'Agricultura y Ganadería',          'Agricultura',      'primario',             TRUE,  1),
    ('agroindustria',       'Agroindustria',                    'Agroindustria',    'secundario',           TRUE,  2),
    ('turismo',             'Turismo',                          'Turismo',          'terciario',            TRUE,  3),
    ('cultura',             'Cultura y Economía Naranja',       'Cultura',          'economia_naranja',     TRUE,  4),
    ('artesanias',          'Artesanías',                       'Artesanías',       'economia_naranja',     TRUE,  5),
    ('medio_ambiente',      'Medio Ambiente',                   'Medio Ambiente',   'economia_verde',       TRUE,  6),
    ('pesca_artesanal',     'Pesca Artesanal',                  'Pesca',            'economia_azul',        TRUE,  7),
    ('hogares',             'Economía del Hogar',               'Hogares',          'social',               TRUE,  8),
    ('aseo_reciclaje',      'Aseo y Reciclaje',                 'Reciclaje',        'economia_circular',    TRUE,  9),
    ('industria',           'Industria y Manufactura',          'Industria',        'secundario',           TRUE,  10),
    ('energia_limpia',      'Energía Limpia',                   'Energía',          'economia_verde',       TRUE,  11),
    ('economia_cuidado',    'Economía del Cuidado',             'Cuidado',          'social',               TRUE,  12),
    ('economia_plateada',   'Economía Plateada (Adulto Mayor)', 'Plateada',         'social',               TRUE,  13),
    ('economia_circular',   'Economía Circular',                'Circular',         'economia_circular',    TRUE,  14),
    ('bioeconomia',         'Bioeconomía',                      'Bioeconomía',      'economia_verde',       TRUE,  15),
    ('empleos_verdes',      'Empleos Verdes',                   'Empleos Verdes',   'economia_verde',       TRUE,  16),
    ('otros',               'Otros Sectores',                   'Otros',            'general',              FALSE, 99)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tabla: economic_agent_types
-- Catálogo de tipos de agentes económicos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS economic_agent_types (
    id          SERIAL      PRIMARY KEY,
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    -- 'micro','pyme','grande','social'
    category    VARCHAR(100),
    is_active   BOOLEAN     DEFAULT TRUE,
    sort_order  SMALLINT    DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT economic_agent_types_code_unique UNIQUE (code)
);

COMMENT ON TABLE economic_agent_types IS 'Tipos de agentes económicos reconocidos por el sistema PSP';

-- Seed: agentes del documento PSP
INSERT INTO economic_agent_types (code, name, category, sort_order)
VALUES
    ('agricultor',          'Agricultor',                   'micro',    1),
    ('colaborador',         'Colaborador',                  'micro',    2),
    ('emprendedor',         'Emprendedor',                  'micro',    3),
    ('micro_empresa',       'Micro Empresa',                'micro',    4),
    ('pequena_empresa',     'Pequeña Empresa',              'pyme',     5),
    ('mediana_empresa',     'Mediana Empresa',              'pyme',     6),
    ('grande_empresa',      'Grande Empresa',               'grande',   7),
    ('empresa_social',      'Empresa Social',               'social',   8),
    ('cooperativa',         'Cooperativa',                  'social',   9),
    ('ong_osc',             'ONG y OSC',                    'social',   10),
    ('autonomo',            'Trabajador Autónomo',          'micro',    11),
    ('empresa_dinamica',    'Empresa Dinámica',             'grande',   12),
    ('empresa_participada', 'Empresa Participada',          'grande',   13),
    ('servicio_domestico',  'Servicio Doméstico',           'micro',    14),
    ('trabajador_manual',   'Trabajador Manual',            'micro',    15),
    ('otro',                'Otro',                         'general',  99)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tabla: strategic_services
-- Catálogo de servicios estratégicos ofrecidos por la Iniciativa
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strategic_services (
    id          SERIAL      PRIMARY KEY,
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    category    VARCHAR(100),
    is_active   BOOLEAN     DEFAULT TRUE,
    sort_order  SMALLINT    DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT strategic_services_code_unique UNIQUE (code)
);

COMMENT ON TABLE strategic_services IS 'Servicios estratégicos disponibles para actores económicos';

-- Seed: servicios del documento PSP
INSERT INTO strategic_services (code, name, sort_order)
VALUES
    ('capacitacion',            'Capacitación',                                 1),
    ('incubacion_aceleracion',  'Incubación y Aceleración',                     2),
    ('no_financieros',          'Servicios No Financieros',                     3),
    ('financieros',             'Servicios Financieros',                        4),
    ('infraestructuras',        'Infraestructuras',                             5),
    ('informacion_benchmark',   'Información y Benchmarking',                   6),
    ('comercializacion',        'Comercialización',                             7),
    ('exportacion',             'Exportación',                                  8),
    ('asociacion_cooperacion',  'Asociación y Cooperación',                     9),
    ('formalizacion',           'Formalización Empresarial',                    10),
    ('marketing_digital',       'Marketing Digital',                            11),
    ('id',                      'Investigación y Desarrollo (I+D)',             12),
    ('otros',                   'Otros Servicios',                              99)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tabla: actor_economic_profiles
-- Perfil económico ampliado por actor
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS actor_economic_profiles (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    actor_id                UUID        NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    economic_agent_type_id  INTEGER     REFERENCES economic_agent_types(id) ON DELETE SET NULL,
    primary_sector_id       INTEGER     REFERENCES economic_sectors(id) ON DELETE SET NULL,
    secondary_sector_ids    INTEGER[]   DEFAULT '{}',
    annual_revenue          NUMERIC(16, 2),
    employees_count         INTEGER     DEFAULT 0,
    formalization_status    VARCHAR(30) DEFAULT 'informal'
                                CHECK (formalization_status IN ('informal', 'en_proceso', 'formal')),
    ruc_verified            BOOLEAN     DEFAULT FALSE,
    dgi_registered          BOOLEAN     DEFAULT FALSE,
    css_registered          BOOLEAN     DEFAULT FALSE,
    mitradel_registered     BOOLEAN     DEFAULT FALSE,
    services_used           INTEGER[]   DEFAULT '{}',   -- FK→strategic_services.id
    certifications          TEXT[],
    export_ready            BOOLEAN     DEFAULT FALSE,
    digital_marketing       BOOLEAN     DEFAULT FALSE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT actor_econ_profiles_pkey          PRIMARY KEY (id),
    CONSTRAINT actor_econ_profiles_actor_unique  UNIQUE (actor_id)
);

CREATE INDEX IF NOT EXISTS idx_aep_actor_id         ON actor_economic_profiles (actor_id);
CREATE INDEX IF NOT EXISTS idx_aep_agent_type       ON actor_economic_profiles (economic_agent_type_id);
CREATE INDEX IF NOT EXISTS idx_aep_primary_sector   ON actor_economic_profiles (primary_sector_id);
CREATE INDEX IF NOT EXISTS idx_aep_formalization    ON actor_economic_profiles (formalization_status);

CREATE TRIGGER trg_aep_updated_at
    BEFORE UPDATE ON actor_economic_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE actor_economic_profiles IS 'Perfil económico ampliado de actores: sector, formalización, ingresos y servicios';

-- -----------------------------------------------------------------------------
-- Vista: v_economic_actors_summary
-- Resumen de actores económicos con datos de sector y tipo de agente
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_economic_actors_summary AS
SELECT
    aep.id                          AS profile_id,
    aep.actor_id,
    a.full_name                     AS actor_full_name,
    a.actor_type,
    a.status                        AS actor_status,
    eat.code                        AS agent_type_code,
    eat.name                        AS agent_type_name,
    eat.category                    AS agent_category,
    es.code                         AS primary_sector_code,
    es.name                         AS primary_sector_name,
    es.category                     AS sector_category,
    aep.annual_revenue,
    aep.employees_count,
    aep.formalization_status,
    aep.ruc_verified,
    aep.dgi_registered,
    aep.css_registered,
    aep.export_ready,
    aep.digital_marketing,
    t.name                          AS territorial_name,
    aep.created_at,
    aep.updated_at
FROM actor_economic_profiles aep
JOIN actors                  a   ON a.id   = aep.actor_id
LEFT JOIN economic_agent_types eat ON eat.id = aep.economic_agent_type_id
LEFT JOIN economic_sectors     es  ON es.id  = aep.primary_sector_id
LEFT JOIN territorial_items    t   ON t.id   = a.territorial_id;

COMMENT ON VIEW v_economic_actors_summary IS 'Vista consolidada de actores económicos con sector, tipo de agente y métricas';

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE actor_economic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aep_read_authenticated"
    ON actor_economic_profiles FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "aep_insert_operador"
    ON actor_economic_profiles FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "aep_update_operador"
    ON actor_economic_profiles FOR UPDATE USING (has_role('operador'));

CREATE POLICY "aep_delete_admin"
    ON actor_economic_profiles FOR DELETE USING (has_role('admin'));

-- Los catálogos (economic_sectors, economic_agent_types, strategic_services) son
-- de solo lectura para usuarios autenticados y solo modificables por administradores

ALTER TABLE economic_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "econ_sectors_read_authenticated"
    ON economic_sectors FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "econ_sectors_write_admin"
    ON economic_sectors FOR INSERT WITH CHECK (has_role('admin'));

CREATE POLICY "econ_sectors_update_admin"
    ON economic_sectors FOR UPDATE USING (has_role('admin'));

-- ---

ALTER TABLE economic_agent_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "econ_agents_read_authenticated"
    ON economic_agent_types FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "econ_agents_write_admin"
    ON economic_agent_types FOR INSERT WITH CHECK (has_role('admin'));

CREATE POLICY "econ_agents_update_admin"
    ON economic_agent_types FOR UPDATE USING (has_role('admin'));

-- ---

ALTER TABLE strategic_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strat_services_read_authenticated"
    ON strategic_services FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "strat_services_write_admin"
    ON strategic_services FOR INSERT WITH CHECK (has_role('admin'));

CREATE POLICY "strat_services_update_admin"
    ON strategic_services FOR UPDATE USING (has_role('admin'));
