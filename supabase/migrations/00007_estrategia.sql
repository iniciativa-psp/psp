-- =============================================================================
-- Fase 1 – Módulo Estrategia
-- Planes, programas, proyectos y actividades del SIG-PSP
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

CREATE TYPE strategy_level AS ENUM (
    'plan',
    'programa',
    'proyecto',
    'actividad'
);

CREATE TYPE strategy_status AS ENUM (
    'draft',
    'review',
    'approved',
    'active',
    'completed',
    'cancelled'
);

CREATE TYPE risk_level AS ENUM (
    'very_low',
    'low',
    'medium',
    'high',
    'very_high'
);

-- -----------------------------------------------------------------------------
-- Tabla principal: strategy_items
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strategy_items (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    parent_id           UUID            REFERENCES strategy_items(id) ON DELETE RESTRICT,
    level               strategy_level  NOT NULL,
    code                VARCHAR(50)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    objective           TEXT,
    status              strategy_status NOT NULL DEFAULT 'draft',
    responsible_id      UUID            REFERENCES actors(id) ON DELETE SET NULL,
    team_ids            UUID[]          NOT NULL DEFAULT '{}',
    start_date          DATE,
    end_date            DATE,
    budget_planned      NUMERIC(18, 2),
    budget_executed     NUMERIC(18, 2)  DEFAULT 0,
    currency            VARCHAR(3)      NOT NULL DEFAULT 'USD',
    kpi_target          NUMERIC(14, 4),
    kpi_current         NUMERIC(14, 4)  DEFAULT 0,
    kpi_unit            VARCHAR(50),
    ods_goals           INTEGER[],
    territorial_id      BIGINT          REFERENCES territorial_items(id) ON DELETE SET NULL,
    risk_probability    risk_level,
    risk_impact         risk_level,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by          UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT strategy_items_pkey       PRIMARY KEY (id),
    CONSTRAINT strategy_items_code_unique UNIQUE (code),

    -- Reglas de jerarquía: plan → programa → proyecto → actividad
    CONSTRAINT strategy_items_hierarchy  CHECK (
        (level = 'plan'       AND parent_id IS NULL)
        OR (level = 'programa'  AND parent_id IS NOT NULL)
        OR (level = 'proyecto'  AND parent_id IS NOT NULL)
        OR (level = 'actividad' AND parent_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_strategy_parent_id     ON strategy_items (parent_id);
CREATE INDEX IF NOT EXISTS idx_strategy_level         ON strategy_items (level);
CREATE INDEX IF NOT EXISTS idx_strategy_status        ON strategy_items (status);
CREATE INDEX IF NOT EXISTS idx_strategy_responsible   ON strategy_items (responsible_id);
CREATE INDEX IF NOT EXISTS idx_strategy_territorial   ON strategy_items (territorial_id);
CREATE INDEX IF NOT EXISTS idx_strategy_is_active     ON strategy_items (is_active);
CREATE INDEX IF NOT EXISTS idx_strategy_dates         ON strategy_items (start_date, end_date);

CREATE TRIGGER trg_strategy_items_updated_at
    BEFORE UPDATE ON strategy_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE strategy_items IS 'Árbol de planificación estratégica: planes, programas, proyectos y actividades';

-- -----------------------------------------------------------------------------
-- Tabla: strategy_status_log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS strategy_status_log (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    strategy_id     UUID            NOT NULL REFERENCES strategy_items(id) ON DELETE CASCADE,
    old_status      strategy_status,
    new_status      strategy_status NOT NULL,
    changed_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
    notes           TEXT,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_log_strategy ON strategy_status_log (strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_log_changed  ON strategy_status_log (changed_at);

COMMENT ON TABLE strategy_status_log IS 'Bitácora de cambios de estado de ítems estratégicos';

-- -----------------------------------------------------------------------------
-- Trigger: registrar cambios de estado automáticamente
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_strategy_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO strategy_status_log (strategy_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_strategy_status_log
    AFTER UPDATE ON strategy_items
    FOR EACH ROW EXECUTE FUNCTION log_strategy_status_change();

-- -----------------------------------------------------------------------------
-- Vista: v_strategy_summary
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_strategy_summary AS
SELECT
    s.id,
    s.parent_id,
    s.level,
    s.code,
    s.name,
    s.description,
    s.objective,
    s.status,
    s.responsible_id,
    a.full_name  AS responsible_name,
    s.team_ids,
    s.start_date,
    s.end_date,
    s.budget_planned,
    s.budget_executed,
    s.currency,
    CASE
        WHEN s.budget_planned > 0
        THEN ROUND((s.budget_executed / s.budget_planned) * 100, 2)
        ELSE 0
    END          AS budget_pct,
    s.kpi_target,
    s.kpi_current,
    s.kpi_unit,
    CASE
        WHEN s.kpi_target > 0
        THEN ROUND((s.kpi_current / s.kpi_target) * 100, 2)
        ELSE 0
    END          AS kpi_pct,
    s.ods_goals,
    s.territorial_id,
    t.name       AS territorial_name,
    s.risk_probability,
    s.risk_impact,
    s.is_active,
    s.created_by,
    s.created_at,
    s.updated_at
FROM strategy_items s
LEFT JOIN actors           a ON a.id = s.responsible_id
LEFT JOIN territorial_items t ON t.id = s.territorial_id;

-- -----------------------------------------------------------------------------
-- Función: get_strategy_tree(root_id) — árbol recursivo de ítems
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_strategy_tree(root_id UUID)
RETURNS TABLE (
    id          UUID,
    parent_id   UUID,
    level       strategy_level,
    code        VARCHAR,
    name        VARCHAR,
    status      strategy_status,
    depth       INTEGER
)
LANGUAGE sql STABLE AS $$
WITH RECURSIVE tree AS (
    SELECT s.id, s.parent_id, s.level, s.code, s.name, s.status, 0 AS depth
    FROM strategy_items s
    WHERE s.id = root_id

    UNION ALL

    SELECT s.id, s.parent_id, s.level, s.code, s.name, s.status, tree.depth + 1
    FROM strategy_items s
    JOIN tree ON s.parent_id = tree.id
)
SELECT id, parent_id, level, code, name, status, depth
FROM tree
ORDER BY depth, code;
$$;

-- -----------------------------------------------------------------------------
-- Función: get_strategy_budget_summary(plan_id) — agregación recursiva de presupuesto
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_strategy_budget_summary(plan_id UUID)
RETURNS TABLE (
    id               UUID,
    level            strategy_level,
    code             VARCHAR,
    name             VARCHAR,
    budget_planned   NUMERIC,
    budget_executed  NUMERIC,
    budget_pct       NUMERIC
)
LANGUAGE sql STABLE AS $$
WITH RECURSIVE tree AS (
    SELECT s.id, s.parent_id, s.level, s.code, s.name,
           s.budget_planned, s.budget_executed
    FROM strategy_items s
    WHERE s.id = plan_id

    UNION ALL

    SELECT s.id, s.parent_id, s.level, s.code, s.name,
           s.budget_planned, s.budget_executed
    FROM strategy_items s
    JOIN tree ON s.parent_id = tree.id
)
SELECT
    id,
    level,
    code,
    name,
    COALESCE(budget_planned, 0)   AS budget_planned,
    COALESCE(budget_executed, 0)  AS budget_executed,
    CASE
        WHEN COALESCE(budget_planned, 0) > 0
        THEN ROUND((COALESCE(budget_executed, 0) / COALESCE(budget_planned, 1)) * 100, 2)
        ELSE 0
    END AS budget_pct
FROM tree
ORDER BY code;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE strategy_items ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer
CREATE POLICY "strategy_read_authenticated"
    ON strategy_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Gestor o superior puede insertar/actualizar
CREATE POLICY "strategy_write_gestor"
    ON strategy_items FOR INSERT
    WITH CHECK (has_role('gestor'));

CREATE POLICY "strategy_update_gestor"
    ON strategy_items FOR UPDATE
    USING (has_role('gestor'));

-- Solo admin puede eliminar
CREATE POLICY "strategy_delete_admin"
    ON strategy_items FOR DELETE
    USING (has_role('admin'));

ALTER TABLE strategy_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategy_log_read_authenticated"
    ON strategy_status_log FOR SELECT
    USING (auth.uid() IS NOT NULL);
