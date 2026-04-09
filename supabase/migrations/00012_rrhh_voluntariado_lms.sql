-- =============================================================================
-- Fase 2 – Módulos RRHH Institucional, Voluntariado y LMS (Formación)
-- =============================================================================

-- =============================================================================
-- SECCIÓN 1: RRHH Institucional
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: employees
-- Empleados de la Iniciativa Panamá Sin Pobreza
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_id        UUID            REFERENCES actors(id) ON DELETE SET NULL,
    profile_id      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    employee_code   VARCHAR(30)     NOT NULL,
    position        VARCHAR(200)    NOT NULL,
    department      VARCHAR(100),
    hire_date       DATE            NOT NULL,
    contract_type   VARCHAR(50)     DEFAULT 'indefinido'
                        CHECK (contract_type IN ('indefinido', 'temporal', 'pasantia', 'consultor', 'voluntario')),
    salary          NUMERIC(12, 2),
    salary_currency VARCHAR(3)      DEFAULT 'USD',
    territorial_id  BIGINT          REFERENCES territorial_items(id) ON DELETE SET NULL,
    manager_id      UUID            REFERENCES employees(id) ON DELETE SET NULL,
    status          VARCHAR(30)     DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave', 'terminated')),
    end_date        DATE,
    notes           TEXT,
    is_active       BOOLEAN         DEFAULT TRUE,
    created_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT employees_pkey        PRIMARY KEY (id),
    CONSTRAINT employees_code_unique UNIQUE (employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employees_actor_id      ON employees (actor_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile_id    ON employees (profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id    ON employees (manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_department    ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_status        ON employees (status);
CREATE INDEX IF NOT EXISTS idx_employees_territorial   ON employees (territorial_id);

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE employees IS 'Empleados y colaboradores de la Iniciativa Panamá Sin Pobreza';

-- -----------------------------------------------------------------------------
-- Tabla: performance_evaluations
-- Evaluaciones de desempeño trimestrales/anuales
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS performance_evaluations (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    evaluator_id        UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    period_year         SMALLINT        NOT NULL,
    period_quarter      SMALLINT        CHECK (period_quarter BETWEEN 1 AND 4),
    institutional_score NUMERIC(5, 2)   CHECK (institutional_score BETWEEN 0 AND 100),
    area_score          NUMERIC(5, 2)   CHECK (area_score BETWEEN 0 AND 100),
    individual_score    NUMERIC(5, 2)   CHECK (individual_score BETWEEN 0 AND 100),
    -- Multiplicador por impacto social (0.0 – 1.5)
    impact_factor       NUMERIC(5, 4)   DEFAULT 1.0,
    -- Calculado automáticamente: (0.5×inst + 0.3×área + 0.2×ind) × impact
    final_score         NUMERIC(5, 2),
    comments            TEXT,
    status              VARCHAR(20)     DEFAULT 'draft'
                            CHECK (status IN ('draft', 'submitted', 'approved')),
    evaluated_at        DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT perf_eval_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_perf_eval_employee   ON performance_evaluations (employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_eval_period     ON performance_evaluations (period_year, period_quarter);

-- Función trigger para calcular final_score automáticamente
CREATE OR REPLACE FUNCTION calc_performance_final_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.institutional_score IS NOT NULL
       AND NEW.area_score IS NOT NULL
       AND NEW.individual_score IS NOT NULL THEN
        NEW.final_score := ROUND(
            (0.5 * NEW.institutional_score
             + 0.3 * NEW.area_score
             + 0.2 * NEW.individual_score)
            * COALESCE(NEW.impact_factor, 1.0),
            2
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calc_final_score
    BEFORE INSERT OR UPDATE ON performance_evaluations
    FOR EACH ROW EXECUTE FUNCTION calc_performance_final_score();

COMMENT ON TABLE performance_evaluations IS 'Evaluaciones de desempeño por empleado (trimestral/anual)';

-- =============================================================================
-- SECCIÓN 2: Voluntariado
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: volunteer_opportunities
-- Vacantes de voluntariado (análoga a job_positions)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS volunteer_opportunities (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    strategy_id     UUID        REFERENCES strategy_items(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    sector          VARCHAR(100),
    territorial_id  BIGINT      REFERENCES territorial_items(id) ON DELETE SET NULL,
    slots_available INTEGER     DEFAULT 1,
    slots_filled    INTEGER     DEFAULT 0,
    skills_required TEXT,
    hours_per_week  NUMERIC(5, 2),
    is_remote       BOOLEAN     DEFAULT FALSE,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(30) DEFAULT 'open'
                        CHECK (status IN ('open', 'filled', 'completed', 'cancelled')),
    is_active       BOOLEAN     DEFAULT TRUE,
    created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT volunteer_opportunities_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_vol_opp_strategy     ON volunteer_opportunities (strategy_id);
CREATE INDEX IF NOT EXISTS idx_vol_opp_territorial  ON volunteer_opportunities (territorial_id);
CREATE INDEX IF NOT EXISTS idx_vol_opp_status       ON volunteer_opportunities (status);

CREATE TRIGGER trg_vol_opportunities_updated_at
    BEFORE UPDATE ON volunteer_opportunities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE volunteer_opportunities IS 'Vacantes y convocatorias de voluntariado';

-- -----------------------------------------------------------------------------
-- Tabla: volunteer_registrations
-- Inscripciones de actores a oportunidades de voluntariado
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS volunteer_registrations (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    opportunity_id          UUID        NOT NULL REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
    actor_id                UUID        NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    status                  VARCHAR(30) DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'withdrawn')),
    hours_logged            NUMERIC(8, 2) DEFAULT 0,
    certificate_code        VARCHAR(100),   -- código QR único
    certificate_issued_at   TIMESTAMPTZ,
    impact_notes            TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT volunteer_registrations_pkey             PRIMARY KEY (id),
    CONSTRAINT volunteer_registrations_cert_unique      UNIQUE (certificate_code),
    CONSTRAINT volunteer_registrations_unique_reg       UNIQUE (opportunity_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_vol_reg_opportunity  ON volunteer_registrations (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_vol_reg_actor        ON volunteer_registrations (actor_id);
CREATE INDEX IF NOT EXISTS idx_vol_reg_status       ON volunteer_registrations (status);

CREATE TRIGGER trg_vol_registrations_updated_at
    BEFORE UPDATE ON volunteer_registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE volunteer_registrations IS 'Inscripciones de voluntarios a oportunidades';

-- -----------------------------------------------------------------------------
-- Tabla: volunteer_sessions
-- Jornadas/sesiones de trabajo voluntario registradas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS volunteer_sessions (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    registration_id         UUID        NOT NULL REFERENCES volunteer_registrations(id) ON DELETE CASCADE,
    session_date            DATE        NOT NULL,
    hours                   NUMERIC(5, 2) NOT NULL,
    territorial_id          BIGINT      REFERENCES territorial_items(id) ON DELETE SET NULL,
    activity_description    TEXT,
    evidence_url            TEXT,
    verified_by             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT volunteer_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_vol_sessions_registration ON volunteer_sessions (registration_id);
CREATE INDEX IF NOT EXISTS idx_vol_sessions_date         ON volunteer_sessions (session_date);

COMMENT ON TABLE volunteer_sessions IS 'Jornadas de voluntariado con horas y evidencias registradas';

-- =============================================================================
-- SECCIÓN 3: LMS (Formación y Capacitación)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: courses
-- Catálogo de cursos y capacitaciones
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    code                    VARCHAR(50)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    category                VARCHAR(100),
    modality                VARCHAR(50)     DEFAULT 'virtual'
                                CHECK (modality IN ('virtual', 'presencial', 'hibrido')),
    duration_hours          NUMERIC(8, 2),
    max_participants        INTEGER,
    strategy_id             UUID            REFERENCES strategy_items(id) ON DELETE SET NULL,
    territorial_id          BIGINT          REFERENCES territorial_items(id) ON DELETE SET NULL,
    instructor_actor_id     UUID            REFERENCES actors(id) ON DELETE SET NULL,
    certificate_template    TEXT,   -- URL o template HTML
    requires_evaluation     BOOLEAN         DEFAULT TRUE,
    passing_score           NUMERIC(5, 2)   DEFAULT 70,
    status                  VARCHAR(30)     DEFAULT 'draft'
                                CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
    start_date              DATE,
    end_date                DATE,
    is_active               BOOLEAN         DEFAULT TRUE,
    created_by              UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT courses_pkey        PRIMARY KEY (id),
    CONSTRAINT courses_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_courses_strategy     ON courses (strategy_id);
CREATE INDEX IF NOT EXISTS idx_courses_territorial  ON courses (territorial_id);
CREATE INDEX IF NOT EXISTS idx_courses_status       ON courses (status);
CREATE INDEX IF NOT EXISTS idx_courses_modality     ON courses (modality);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE courses IS 'Catálogo de cursos y programas de formación del LMS';

-- -----------------------------------------------------------------------------
-- Tabla: course_enrollments
-- Inscripciones de actores a cursos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_enrollments (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    course_id               UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    actor_id                UUID            NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    enrolled_at             TIMESTAMPTZ     DEFAULT NOW(),
    completion_pct          NUMERIC(5, 2)   DEFAULT 0,
    final_score             NUMERIC(5, 2),
    passed                  BOOLEAN         DEFAULT FALSE,
    certificate_code        VARCHAR(100),
    certificate_issued_at   TIMESTAMPTZ,
    certificate_url         TEXT,
    status                  VARCHAR(30)     DEFAULT 'enrolled'
                                CHECK (status IN ('enrolled', 'in_progress', 'completed', 'withdrawn', 'failed')),
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT course_enrollments_pkey        PRIMARY KEY (id),
    CONSTRAINT course_enrollments_cert_unique UNIQUE (certificate_code),
    CONSTRAINT course_enrollments_unique_enr  UNIQUE (course_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_course   ON course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_actor    ON course_enrollments (actor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status   ON course_enrollments (status);

CREATE TRIGGER trg_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE course_enrollments IS 'Inscripciones de actores a cursos del LMS';

-- -----------------------------------------------------------------------------
-- Tabla: course_evaluations
-- Evaluaciones (parcial, final, práctica) por inscripción
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_evaluations (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    enrollment_id   UUID            NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    evaluation_type VARCHAR(50)     DEFAULT 'final'
                        CHECK (evaluation_type IN ('parcial', 'final', 'practica')),
    score           NUMERIC(5, 2),
    max_score       NUMERIC(5, 2)   DEFAULT 100,
    evaluated_at    TIMESTAMPTZ     DEFAULT NOW(),
    notes           TEXT,

    CONSTRAINT course_evaluations_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_course_eval_enrollment ON course_evaluations (enrollment_id);

COMMENT ON TABLE course_evaluations IS 'Evaluaciones por inscripción: parcial, final y práctica';

-- -----------------------------------------------------------------------------
-- Función: generate_certificate_code(prefix)
-- Genera un código alfanumérico único para certificados
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_certificate_code(prefix TEXT DEFAULT 'CERT')
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    v_code TEXT;
BEGIN
    v_code := prefix
        || '-'
        || TO_CHAR(NOW(), 'YYYYMMDD')
        || '-'
        || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_certificate_code IS 'Genera un código único para certificados de voluntariado y formación';

-- -----------------------------------------------------------------------------
-- Vista: v_volunteer_impact
-- Impacto consolidado por voluntario: horas, sesiones y cobertura territorial
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_volunteer_impact AS
SELECT
    vr.actor_id,
    a.full_name                         AS actor_full_name,
    a.actor_type,
    COUNT(DISTINCT vs.id)               AS total_sessions,
    COALESCE(SUM(vs.hours), 0)          AS total_hours,
    COUNT(DISTINCT vo.id)               AS total_opportunities,
    COUNT(DISTINCT vs.territorial_id)   AS territorial_coverage,
    STRING_AGG(DISTINCT t.name, ', ')   AS territories
FROM volunteer_registrations vr
JOIN actors                 a  ON a.id  = vr.actor_id
JOIN volunteer_opportunities vo ON vo.id = vr.opportunity_id
LEFT JOIN volunteer_sessions vs ON vs.registration_id = vr.id
LEFT JOIN territorial_items  t  ON t.id  = vs.territorial_id
GROUP BY vr.actor_id, a.full_name, a.actor_type;

COMMENT ON VIEW v_volunteer_impact IS 'Impacto acumulado por voluntario: horas, sesiones y cobertura territorial';

-- -----------------------------------------------------------------------------
-- Vista: v_course_stats
-- Estadísticas por curso: inscritos, progreso, aprobados y promedio de notas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_course_stats AS
SELECT
    c.id                                                                        AS course_id,
    c.code,
    c.name,
    c.modality,
    c.status                                                                    AS course_status,
    COUNT(e.id)                                                                 AS total_enrolled,
    COUNT(e.id) FILTER (WHERE e.status = 'in_progress')                        AS in_progress,
    COUNT(e.id) FILTER (WHERE e.status = 'completed')                          AS completed,
    COUNT(e.id) FILTER (WHERE e.status = 'failed')                             AS failed,
    COUNT(e.id) FILTER (WHERE e.status = 'withdrawn')                          AS withdrawn,
    ROUND(AVG(e.final_score) FILTER (WHERE e.final_score IS NOT NULL), 2)      AS avg_score,
    CASE
        WHEN COUNT(e.id) > 0
        THEN ROUND(
            COUNT(e.id) FILTER (WHERE e.status = 'completed')::NUMERIC
            / COUNT(e.id)::NUMERIC * 100,
            2
        )
        ELSE 0
    END                                                                         AS completion_rate
FROM courses c
LEFT JOIN course_enrollments e ON e.course_id = c.id
GROUP BY c.id, c.code, c.name, c.modality, c.status;

COMMENT ON VIEW v_course_stats IS 'Estadísticas de inscripción y rendimiento por curso del LMS';

-- =============================================================================
-- Row-Level Security — todas las tablas nuevas
-- =============================================================================

-- employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_authenticated"
    ON employees FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "employees_insert_operador"
    ON employees FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "employees_update_operador"
    ON employees FOR UPDATE USING (has_role('operador'));

CREATE POLICY "employees_delete_admin"
    ON employees FOR DELETE USING (has_role('admin'));

-- performance_evaluations
ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_eval_read_authenticated"
    ON performance_evaluations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "perf_eval_insert_operador"
    ON performance_evaluations FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "perf_eval_update_gestor"
    ON performance_evaluations FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "perf_eval_delete_admin"
    ON performance_evaluations FOR DELETE USING (has_role('admin'));

-- volunteer_opportunities
ALTER TABLE volunteer_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vol_opp_read_authenticated"
    ON volunteer_opportunities FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vol_opp_insert_operador"
    ON volunteer_opportunities FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "vol_opp_update_operador"
    ON volunteer_opportunities FOR UPDATE USING (has_role('operador'));

CREATE POLICY "vol_opp_delete_admin"
    ON volunteer_opportunities FOR DELETE USING (has_role('admin'));

-- volunteer_registrations
ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vol_reg_read_authenticated"
    ON volunteer_registrations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vol_reg_insert_operador"
    ON volunteer_registrations FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "vol_reg_update_operador"
    ON volunteer_registrations FOR UPDATE USING (has_role('operador'));

CREATE POLICY "vol_reg_delete_admin"
    ON volunteer_registrations FOR DELETE USING (has_role('admin'));

-- volunteer_sessions
ALTER TABLE volunteer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vol_sess_read_authenticated"
    ON volunteer_sessions FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vol_sess_insert_operador"
    ON volunteer_sessions FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "vol_sess_update_gestor"
    ON volunteer_sessions FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "vol_sess_delete_admin"
    ON volunteer_sessions FOR DELETE USING (has_role('admin'));

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_read_authenticated"
    ON courses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "courses_insert_operador"
    ON courses FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "courses_update_gestor"
    ON courses FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "courses_delete_admin"
    ON courses FOR DELETE USING (has_role('admin'));

-- course_enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_read_authenticated"
    ON course_enrollments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "enrollments_insert_operador"
    ON course_enrollments FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "enrollments_update_operador"
    ON course_enrollments FOR UPDATE USING (has_role('operador'));

CREATE POLICY "enrollments_delete_admin"
    ON course_enrollments FOR DELETE USING (has_role('admin'));

-- course_evaluations
ALTER TABLE course_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_eval_read_authenticated"
    ON course_evaluations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "course_eval_insert_operador"
    ON course_evaluations FOR INSERT WITH CHECK (has_role('operador'));

CREATE POLICY "course_eval_update_gestor"
    ON course_evaluations FOR UPDATE USING (has_role('gestor'));

CREATE POLICY "course_eval_delete_admin"
    ON course_evaluations FOR DELETE USING (has_role('admin'));
