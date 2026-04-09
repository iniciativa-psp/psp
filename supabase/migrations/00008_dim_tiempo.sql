-- =============================================================================
-- Fase 2 – Módulo Fecha/Tiempo (Dimensión transversal)
-- Tabla dimensional para reportes comparativos y análisis temporal
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: dim_time
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dim_time (
    id              DATE            NOT NULL,
    year            SMALLINT        NOT NULL,
    quarter         SMALLINT        NOT NULL,
    month           SMALLINT        NOT NULL,
    week_iso        SMALLINT        NOT NULL,
    day_of_month    SMALLINT        NOT NULL,
    day_of_week     SMALLINT        NOT NULL,  -- 1=lunes … 7=domingo (ISO)
    day_of_year     SMALLINT        NOT NULL,
    month_name      VARCHAR(20)     NOT NULL,
    month_name_es   VARCHAR(20)     NOT NULL,
    day_name        VARCHAR(20)     NOT NULL,
    day_name_es     VARCHAR(20)     NOT NULL,
    is_weekend      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_holiday      BOOLEAN         NOT NULL DEFAULT FALSE,
    holiday_name    VARCHAR(100),
    fiscal_year     SMALLINT        NOT NULL,
    fiscal_quarter  SMALLINT        NOT NULL,

    CONSTRAINT dim_time_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_dim_time_year       ON dim_time (year);
CREATE INDEX IF NOT EXISTS idx_dim_time_month      ON dim_time (year, month);
CREATE INDEX IF NOT EXISTS idx_dim_time_quarter    ON dim_time (year, quarter);
CREATE INDEX IF NOT EXISTS idx_dim_time_is_holiday ON dim_time (is_holiday) WHERE is_holiday = TRUE;

COMMENT ON TABLE  dim_time IS 'Dimensión temporal para reportes – un registro por día';
COMMENT ON COLUMN dim_time.fiscal_year    IS 'Año fiscal panameño (coincide con año calendario)';
COMMENT ON COLUMN dim_time.fiscal_quarter IS 'Trimestre fiscal panameño';

-- -----------------------------------------------------------------------------
-- Tabla: holidays_panama
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS holidays_panama (
    id              SERIAL          NOT NULL,
    holiday_date    DATE            NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    is_recurring    BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT holidays_panama_pkey       PRIMARY KEY (id),
    CONSTRAINT holidays_panama_date_unique UNIQUE (holiday_date)
);

COMMENT ON TABLE holidays_panama IS 'Catálogo de feriados nacionales de Panamá';

-- -----------------------------------------------------------------------------
-- Función: populate_dim_time(start_date, end_date)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION populate_dim_time(p_start DATE, p_end DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    d DATE;
    dow INT;
    m   INT;
    mn_en  VARCHAR(20);
    mn_es  VARCHAR(20);
    dn_en  VARCHAR(20);
    dn_es  VARCHAR(20);
BEGIN
    d := p_start;
    WHILE d <= p_end LOOP
        dow := EXTRACT(ISODOW FROM d)::INT;
        m   := EXTRACT(MONTH FROM d)::INT;

        -- English month name
        mn_en := TO_CHAR(d, 'Month');
        -- Spanish month name
        mn_es := CASE m
            WHEN 1  THEN 'Enero'
            WHEN 2  THEN 'Febrero'
            WHEN 3  THEN 'Marzo'
            WHEN 4  THEN 'Abril'
            WHEN 5  THEN 'Mayo'
            WHEN 6  THEN 'Junio'
            WHEN 7  THEN 'Julio'
            WHEN 8  THEN 'Agosto'
            WHEN 9  THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
        END;

        -- English day name
        dn_en := TO_CHAR(d, 'Day');
        -- Spanish day name
        dn_es := CASE dow
            WHEN 1 THEN 'Lunes'
            WHEN 2 THEN 'Martes'
            WHEN 3 THEN 'Miércoles'
            WHEN 4 THEN 'Jueves'
            WHEN 5 THEN 'Viernes'
            WHEN 6 THEN 'Sábado'
            WHEN 7 THEN 'Domingo'
        END;

        INSERT INTO dim_time (
            id, year, quarter, month, week_iso,
            day_of_month, day_of_week, day_of_year,
            month_name, month_name_es, day_name, day_name_es,
            is_weekend, is_holiday, holiday_name,
            fiscal_year, fiscal_quarter
        ) VALUES (
            d,
            EXTRACT(YEAR FROM d)::SMALLINT,
            EXTRACT(QUARTER FROM d)::SMALLINT,
            m::SMALLINT,
            EXTRACT(WEEK FROM d)::SMALLINT,
            EXTRACT(DAY FROM d)::SMALLINT,
            dow::SMALLINT,
            EXTRACT(DOY FROM d)::SMALLINT,
            TRIM(mn_en),
            mn_es,
            TRIM(dn_en),
            dn_es,
            dow IN (6, 7),
            FALSE,
            NULL,
            EXTRACT(YEAR FROM d)::SMALLINT,
            EXTRACT(QUARTER FROM d)::SMALLINT
        )
        ON CONFLICT (id) DO NOTHING;

        d := d + INTERVAL '1 day';
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Función: refresh_holidays_in_dim_time()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_holidays_in_dim_time()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Reset all holidays
    UPDATE dim_time SET is_holiday = FALSE, holiday_name = NULL
    WHERE is_holiday = TRUE;

    -- Set holidays from catalogue
    UPDATE dim_time dt
    SET is_holiday  = TRUE,
        holiday_name = hp.name
    FROM holidays_panama hp
    WHERE dt.id = hp.holiday_date;
END;
$$;

-- -----------------------------------------------------------------------------
-- Datos semilla: feriados nacionales de Panamá (fijos, 2024–2036)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    y INT;
BEGIN
    FOR y IN 2024..2036 LOOP
        -- Año Nuevo
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 1, 1), 'Año Nuevo', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Día de los Mártires
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 1, 9), 'Día de los Mártires', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Día del Trabajo
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 5, 1), 'Día del Trabajo', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Separación de Panamá de Colombia
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 11, 3), 'Separación de Panamá de Colombia', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Día de los Difuntos
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 11, 2), 'Día de los Difuntos', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Grito de Independencia de la Villa de Los Santos
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 11, 10), 'Grito de Independencia de la Villa de Los Santos', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Independencia de Panamá de España
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 11, 28), 'Independencia de Panamá de España', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Día de la Madre (8 de diciembre)
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 12, 8), 'Día de la Madre / Inmaculada Concepción', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
        -- Navidad
        INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
            (MAKE_DATE(y, 12, 25), 'Navidad', TRUE)
        ON CONFLICT (holiday_date) DO NOTHING;
    END LOOP;
END;
$$;

-- Carnaval y Semana Santa (fechas móviles, calculadas manualmente para cada año)
-- Martes de Carnaval, Miércoles de Ceniza, Viernes Santo
INSERT INTO holidays_panama (holiday_date, name, is_recurring) VALUES
    -- 2024
    ('2024-02-13', 'Martes de Carnaval', FALSE),
    ('2024-02-14', 'Miércoles de Ceniza', FALSE),
    ('2024-03-29', 'Viernes Santo', FALSE),
    -- 2025
    ('2025-03-04', 'Martes de Carnaval', FALSE),
    ('2025-03-05', 'Miércoles de Ceniza', FALSE),
    ('2025-04-18', 'Viernes Santo', FALSE),
    -- 2026
    ('2026-02-17', 'Martes de Carnaval', FALSE),
    ('2026-02-18', 'Miércoles de Ceniza', FALSE),
    ('2026-04-03', 'Viernes Santo', FALSE),
    -- 2027
    ('2027-02-09', 'Martes de Carnaval', FALSE),
    ('2027-02-10', 'Miércoles de Ceniza', FALSE),
    ('2027-03-26', 'Viernes Santo', FALSE),
    -- 2028
    ('2028-02-29', 'Martes de Carnaval', FALSE),
    ('2028-03-01', 'Miércoles de Ceniza', FALSE),
    ('2028-04-14', 'Viernes Santo', FALSE),
    -- 2029
    ('2029-02-13', 'Martes de Carnaval', FALSE),
    ('2029-02-14', 'Miércoles de Ceniza', FALSE),
    ('2029-03-30', 'Viernes Santo', FALSE),
    -- 2030
    ('2030-03-05', 'Martes de Carnaval', FALSE),
    ('2030-03-06', 'Miércoles de Ceniza', FALSE),
    ('2030-04-19', 'Viernes Santo', FALSE),
    -- 2031
    ('2031-02-25', 'Martes de Carnaval', FALSE),
    ('2031-02-26', 'Miércoles de Ceniza', FALSE),
    ('2031-04-11', 'Viernes Santo', FALSE),
    -- 2032
    ('2032-02-10', 'Martes de Carnaval', FALSE),
    ('2032-02-11', 'Miércoles de Ceniza', FALSE),
    ('2032-03-26', 'Viernes Santo', FALSE),
    -- 2033
    ('2033-03-01', 'Martes de Carnaval', FALSE),
    ('2033-03-02', 'Miércoles de Ceniza', FALSE),
    ('2033-04-15', 'Viernes Santo', FALSE),
    -- 2034
    ('2034-02-21', 'Martes de Carnaval', FALSE),
    ('2034-02-22', 'Miércoles de Ceniza', FALSE),
    ('2034-04-07', 'Viernes Santo', FALSE),
    -- 2035
    ('2035-02-06', 'Martes de Carnaval', FALSE),
    ('2035-02-07', 'Miércoles de Ceniza', FALSE),
    ('2035-03-23', 'Viernes Santo', FALSE),
    -- 2036
    ('2036-02-26', 'Martes de Carnaval', FALSE),
    ('2036-02-27', 'Miércoles de Ceniza', FALSE),
    ('2036-04-11', 'Viernes Santo', FALSE)
ON CONFLICT (holiday_date) DO NOTHING;

-- Poblar dimensión temporal completa
SELECT populate_dim_time('2024-01-01'::DATE, '2036-12-31'::DATE);

-- Aplicar feriados sobre dim_time
SELECT refresh_holidays_in_dim_time();

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE dim_time ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dim_time_read_authenticated"
    ON dim_time FOR SELECT
    USING (auth.uid() IS NOT NULL);

ALTER TABLE holidays_panama ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_read_authenticated"
    ON holidays_panama FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "holidays_write_admin"
    ON holidays_panama FOR INSERT
    WITH CHECK (has_role('admin'));

CREATE POLICY "holidays_update_admin"
    ON holidays_panama FOR UPDATE
    USING (has_role('admin'));

CREATE POLICY "holidays_delete_admin"
    ON holidays_panama FOR DELETE
    USING (has_role('admin'));
