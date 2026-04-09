-- =============================================================================
-- Fase 0 – Autenticación, Perfiles y Roles (RBAC)
-- Sistema de roles para el SIG-PSP
-- =============================================================================

-- Tipo ENUM para roles del sistema
CREATE TYPE app_role AS ENUM (
    'superadmin',   -- Control total del sistema
    'admin',        -- Administración de módulos y usuarios
    'gestor',       -- Gestión operativa de módulos asignados
    'operador',     -- Operación diaria (CRUD básico)
    'auditor',      -- Solo lectura + reportes de auditoría
    'viewer'        -- Solo lectura básica
);

-- Tipo ENUM para estado del perfil
CREATE TYPE profile_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_verification'
);

-- -----------------------------------------------------------------------------
-- Tabla de perfiles (extiende auth.users de Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url      TEXT,
    phone           VARCHAR(30),
    role            app_role     NOT NULL DEFAULT 'viewer',
    status          profile_status NOT NULL DEFAULT 'pending_verification',
    territorial_id  BIGINT       REFERENCES territorial_items(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status   ON profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_email    ON profiles (email);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE profiles IS 'Perfiles de usuario extendidos para el SIG-PSP';

-- -----------------------------------------------------------------------------
-- Tabla de bitácora de auditoría para cambios de rol
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_change_log (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    old_role    app_role,
    new_role    app_role    NOT NULL,
    changed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    reason      TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_log_user ON role_change_log (user_id);

-- Trigger para registrar cambios de rol automáticamente
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO role_change_log (user_id, old_role, new_role, changed_by)
        VALUES (NEW.id, OLD.role, NEW.role, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_role_log
    AFTER UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- -----------------------------------------------------------------------------
-- Función: crear perfil automáticamente al registrarse
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Trigger en auth.users para auto-crear perfil
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------------------------------
-- Función helper: obtener rol del usuario actual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Función helper: verificar si usuario tiene rol mínimo
CREATE OR REPLACE FUNCTION has_role(required_role app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    user_role app_role;
    role_hierarchy INT;
    required_hierarchy INT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    IF user_role IS NULL THEN RETURN FALSE; END IF;

    -- Jerarquía: superadmin(6) > admin(5) > gestor(4) > operador(3) > auditor(2) > viewer(1)
    role_hierarchy := CASE user_role
        WHEN 'superadmin' THEN 6
        WHEN 'admin' THEN 5
        WHEN 'gestor' THEN 4
        WHEN 'operador' THEN 3
        WHEN 'auditor' THEN 2
        WHEN 'viewer' THEN 1
    END;

    required_hierarchy := CASE required_role
        WHEN 'superadmin' THEN 6
        WHEN 'admin' THEN 5
        WHEN 'gestor' THEN 4
        WHEN 'operador' THEN 3
        WHEN 'auditor' THEN 2
        WHEN 'viewer' THEN 1
    END;

    RETURN role_hierarchy >= required_hierarchy;
END;
$$;

-- -----------------------------------------------------------------------------
-- Row-Level Security para profiles
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver su propio perfil
CREATE POLICY "profiles_read_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins pueden ver todos los perfiles
CREATE POLICY "profiles_read_admin"
    ON profiles FOR SELECT
    USING (has_role('admin'));

-- Usuarios pueden actualizar su propio perfil (excepto role y status)
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT role FROM profiles WHERE id = auth.uid())
        AND status = (SELECT status FROM profiles WHERE id = auth.uid())
    );

-- Solo superadmin y admin pueden cambiar roles/status
CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE
    USING (has_role('admin'));

ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_log_read_admin"
    ON role_change_log FOR SELECT
    USING (has_role('admin'));
