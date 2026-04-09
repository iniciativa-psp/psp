-- =============================================================================
-- Fase 2 – Módulo Empleos
-- Pilar central de la estrategia: meta de 194,944 nuevos empleos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE employment_type AS ENUM (
    'formal_dependiente',
    'formal_independiente',
    'emprendimiento',
    'cooperativo',
    'pasantia',
    'voluntariado',
    'temporal',
    'medio_tiempo'
);

CREATE TYPE employment_status AS ENUM (
    'open',
    'filled',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE employment_sector AS ENUM (
    'agricultura',
    'comercio',
    'servicios',
    'industria',
    'tecnologia',
    'turismo',
    'construccion',
    'pesca',
    'artesania',
    'logistica',
    'educacion',
    'salud',
    'otro'
);

-- -----------------------------------------------------------------------------
-- Tabla principal: job_positions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_positions (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    strategy_id         UUID                REFERENCES strategy_items(id) ON DELETE SET NULL,
    employer_actor_id   UUID                REFERENCES actors(id) ON DELETE SET NULL,
    title               VARCHAR(255)        NOT NULL,
    description         TEXT,
    employment_type     employment_type     NOT NULL,
    sector              employment_sector   NOT NULL,
    territorial_id      BIGINT              REFERENCES territorial_items(id) ON DELETE SET NULL,
    positions_available INTEGER             NOT NULL DEFAULT 1,
    positions_filled    INTEGER             NOT NULL DEFAULT 0,
    salary_min          NUMERIC(14, 2),
    salary_max          NUMERIC(14, 2),
    currency            VARCHAR(3)          NOT NULL DEFAULT 'USD',
    requirements        TEXT,
    benefits            TEXT,
    is_youth_priority   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_female_priority  BOOLEAN             NOT NULL DEFAULT FALSE,
    is_agricultural     BOOLEAN             NOT NULL DEFAULT FALSE,
    status              employment_status   NOT NULL DEFAULT 'open',
    start_date          DATE,
    end_date            DATE,
    created_by          UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,

    CONSTRAINT job_positions_pkey PRIMARY KEY (id),
    CONSTRAINT job_positions_salary_check CHECK (
        salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
    ),
    CONSTRAINT job_positions_dates_check CHECK (
        start_date IS NULL OR end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT job_positions_filled_check CHECK (positions_filled >= 0 AND positions_filled <= positions_available)
);

CREATE INDEX IF NOT EXISTS idx_job_positions_strategy      ON job_positions (strategy_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_employer      ON job_positions (employer_actor_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_type          ON job_positions (employment_type);
CREATE INDEX IF NOT EXISTS idx_job_positions_sector        ON job_positions (sector);
CREATE INDEX IF NOT EXISTS idx_job_positions_territorial   ON job_positions (territorial_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_status        ON job_positions (status);
CREATE INDEX IF NOT EXISTS idx_job_positions_is_active     ON job_positions (is_active);
CREATE INDEX IF NOT EXISTS idx_job_positions_dates         ON job_positions (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_job_positions_created_by    ON job_positions (created_by);

CREATE TRIGGER trg_job_positions_updated_at
    BEFORE UPDATE ON job_positions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE job_positions IS 'Posiciones laborales/vacantes vinculadas a la estrategia de empleos';

-- -----------------------------------------------------------------------------
-- Tabla: job_applications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_applications (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    job_position_id     UUID            NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
    applicant_actor_id  UUID            NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    cover_letter        TEXT,
    status              VARCHAR(30)     NOT NULL DEFAULT 'pending',
    reviewed_by         UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT job_applications_pkey PRIMARY KEY (id),
    CONSTRAINT job_applications_status_check CHECK (
        status IN ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn')
    ),
    CONSTRAINT job_applications_unique UNIQUE (job_position_id, applicant_actor_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_position   ON job_applications (job_position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant  ON job_applications (applicant_actor_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status     ON job_applications (status);

CREATE TRIGGER trg_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE job_applications IS 'Postulaciones a posiciones laborales';

-- -----------------------------------------------------------------------------
-- Tabla: employment_records (registros de contratación efectiva)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employment_records (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    job_position_id     UUID                REFERENCES job_positions(id) ON DELETE SET NULL,
    employee_actor_id   UUID                NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    employer_actor_id   UUID                REFERENCES actors(id) ON DELETE SET NULL,
    employment_type     employment_type     NOT NULL,
    sector              employment_sector   NOT NULL,
    title               VARCHAR(255),
    salary              NUMERIC(14, 2),
    currency            VARCHAR(3)          NOT NULL DEFAULT 'USD',
    start_date          DATE                NOT NULL,
    end_date            DATE,
    territorial_id      BIGINT              REFERENCES territorial_items(id) ON DELETE SET NULL,
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,
    created_by          UUID                REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT employment_records_pkey PRIMARY KEY (id),
    CONSTRAINT employment_records_dates_check CHECK (
        end_date IS NULL OR start_date <= end_date
    )
);

CREATE INDEX IF NOT EXISTS idx_employment_records_position      ON employment_records (job_position_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_employee      ON employment_records (employee_actor_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_employer      ON employment_records (employer_actor_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_type          ON employment_records (employment_type);
CREATE INDEX IF NOT EXISTS idx_employment_records_sector        ON employment_records (sector);
CREATE INDEX IF NOT EXISTS idx_employment_records_territorial   ON employment_records (territorial_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_is_active     ON employment_records (is_active);

CREATE TRIGGER trg_employment_records_updated_at
    BEFORE UPDATE ON employment_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE employment_records IS 'Registros de contratación/empleo efectivos';

-- -----------------------------------------------------------------------------
-- Vista: v_job_positions_summary
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_job_positions_summary AS
SELECT
    jp.id,
    jp.strategy_id,
    jp.employer_actor_id,
    a.full_name          AS employer_name,
    jp.title,
    jp.description,
    jp.employment_type,
    jp.sector,
    jp.territorial_id,
    t.name               AS territorial_name,
    jp.positions_available,
    jp.positions_filled,
    jp.salary_min,
    jp.salary_max,
    jp.currency,
    jp.requirements,
    jp.benefits,
    jp.is_youth_priority,
    jp.is_female_priority,
    jp.is_agricultural,
    jp.status,
    jp.start_date,
    jp.end_date,
    jp.is_active,
    jp.created_by,
    jp.created_at,
    jp.updated_at,
    (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_position_id = jp.id)::INTEGER AS application_count
FROM job_positions jp
LEFT JOIN actors            a ON a.id = jp.employer_actor_id
LEFT JOIN territorial_items t ON t.id = jp.territorial_id;

-- -----------------------------------------------------------------------------
-- Vista: v_employment_stats
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_employment_stats AS
SELECT
    er.sector,
    er.employment_type,
    er.territorial_id,
    t.name               AS territorial_name,
    COUNT(*)::INTEGER    AS total_records,
    COUNT(*) FILTER (WHERE er.is_active)::INTEGER AS active_records,
    AVG(er.salary)       AS avg_salary
FROM employment_records er
LEFT JOIN territorial_items t ON t.id = er.territorial_id
GROUP BY er.sector, er.employment_type, er.territorial_id, t.name;

-- -----------------------------------------------------------------------------
-- Función: get_employment_dashboard_stats()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_employment_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_positions', (SELECT COUNT(*) FROM job_positions WHERE is_active),
        'positions_open', (SELECT COUNT(*) FROM job_positions WHERE is_active AND status = 'open'),
        'total_vacancies', (SELECT COALESCE(SUM(positions_available), 0) FROM job_positions WHERE is_active),
        'total_filled', (SELECT COALESCE(SUM(positions_filled), 0) FROM job_positions WHERE is_active),
        'total_applications', (SELECT COUNT(*) FROM job_applications),
        'total_employment_records', (SELECT COUNT(*) FROM employment_records WHERE is_active),
        'by_sector', (
            SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
            FROM (
                SELECT sector, COUNT(*)::INTEGER AS count,
                       COALESCE(SUM(positions_available), 0)::INTEGER AS vacancies,
                       COALESCE(SUM(positions_filled), 0)::INTEGER AS filled
                FROM job_positions WHERE is_active
                GROUP BY sector ORDER BY count DESC
            ) s
        ),
        'by_type', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT employment_type, COUNT(*)::INTEGER AS count
                FROM job_positions WHERE is_active
                GROUP BY employment_type ORDER BY count DESC
            ) t
        )
    ) INTO result;
    RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_positions_read_authenticated"
    ON job_positions FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "job_positions_write_operador"
    ON job_positions FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "job_positions_update_operador"
    ON job_positions FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "job_positions_delete_admin"
    ON job_positions FOR DELETE
    USING (has_role('admin'));

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_applications_read_authenticated"
    ON job_applications FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "job_applications_write_operador"
    ON job_applications FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "job_applications_update_operador"
    ON job_applications FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "job_applications_delete_admin"
    ON job_applications FOR DELETE
    USING (has_role('admin'));

ALTER TABLE employment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employment_records_read_authenticated"
    ON employment_records FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "employment_records_write_operador"
    ON employment_records FOR INSERT
    WITH CHECK (has_role('operador'));

CREATE POLICY "employment_records_update_operador"
    ON employment_records FOR UPDATE
    USING (has_role('operador'));

CREATE POLICY "employment_records_delete_admin"
    ON employment_records FOR DELETE
    USING (has_role('admin'));
