# FISCAL_MULTI_ISSUER — Guía de Multi-Emisor y Hardening

Repositorio: `iniciativa-psp/psp`  
Migraciones: `00019_accounting_hardening.sql`, `00020_fiscal_base_ext.sql`, `00021_fiscal_core_multi_issuer.sql`

---

## Resumen de cambios (PR #31)

Este PR agrega tres migraciones incrementales sobre la base establecida en PR #30
(`00016`–`00018`). **No modifica las migraciones ya aplicadas.**

| Migración | Contenido principal |
|-----------|---------------------|
| `00019_accounting_hardening.sql` | `actor_memberships`, `tenant_actor_id` en tablas contables, hardening de `post_payment_to_journal` |
| `00020_fiscal_base_ext.sql` | `tax_id_type`/`tax_id_value` en `actor_tax_profiles`, `tenant_actor_id` en tablas fiscales base |
| `00021_fiscal_core_multi_issuer.sql` | Nueva firma multi-emisor de `emit_fiscal_invoice_from_source`, `doc_number` automático, `tenant_actor_id` en tablas fiscales core |

---

## A) Multi-Tenant: `actor_memberships`

### Diseño

La tabla `actor_memberships` modela la pertenencia de un usuario (`profiles`) a un
tenant (`actors` de tipo organización), con un rol específico dentro de ese tenant.

```sql
-- Columnas relevantes
tenant_actor_id uuid references actors(id)   -- tenant/organización
profile_id      uuid references profiles(id) -- usuario
role            text   -- 'owner' | 'admin' | 'gestor' | 'operador' | 'auditor'
is_active       boolean
```

**Unicidad:** `UNIQUE(tenant_actor_id, profile_id)` — un usuario tiene a lo sumo un rol
por tenant (puede cambiarse actualizando la fila).

### Roles por tenant vs roles globales

| Contexto | Fuente | Descripción |
|----------|--------|-------------|
| Global   | `profiles.role` (enum `app_role`) | Rol global del sistema; `has_role('admin')` da bypass total |
| Por tenant | `actor_memberships.role` (text) | Acceso a los datos de un tenant específico |

`has_role('admin')` (que incluye `superadmin` por jerarquía) actúa como **superadmin
global**: puede leer y operar sobre datos de cualquier tenant. Útil para soporte y
operaciones centralizadas.

### Crear la primera membresía `owner`

```sql
-- Ejecutar como superadmin/admin en Supabase SQL Editor (reemplazar UUIDs reales)
INSERT INTO actor_memberships (tenant_actor_id, profile_id, role, is_active)
VALUES (
    '<UUID del actors.id del tenant>',
    '<UUID del auth.users.id / profiles.id del usuario owner>',
    'owner',
    true
);
```

Para encontrar el `actors.id` y `profiles.id` apropiados:

```sql
-- Ver actores de tipo organización disponibles
SELECT id, full_name, actor_type FROM actors
WHERE actor_type IN ('empresa','cooperativa','ong','institucion_publica')
ORDER BY full_name;

-- Ver perfiles de usuario
SELECT id, email, full_name, role FROM profiles ORDER BY created_at;
```

### Helper de membresía (sin recursión RLS)

La función `is_tenant_member(tenant_actor_id, roles[])` es `SECURITY DEFINER` y permite
que las políticas RLS de otras tablas consulten `actor_memberships` sin recursión:

```sql
-- Ejemplo de uso en policy
USING (
    has_role('admin')
    OR is_tenant_member(tenant_actor_id, ARRAY['owner','admin','gestor','operador','auditor'])
)
```

---

## B) Identificación fiscal ampliada (`actor_tax_profiles`)

### Nuevas columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `tax_id_type` | `text` | Tipo: `'ruc_dv'`, `'cedula'`, `'pasaporte'` |
| `tax_id_value` | `text` | Valor de la identificación |

Las columnas legacy `ruc` y `ruc_dv` **se mantienen** para compatibilidad.

### Reglas de coherencia

| `tax_id_type` | `tax_id_value` | `ruc` | `ruc_dv` |
|---------------|----------------|-------|----------|
| `'ruc_dv'` | = `ruc` (no null) | no null | no null |
| `'cedula'` | no null | null | null |
| `'pasaporte'` | no null | null | null |
| `NULL` | cualquiera | sin restricción adicional |

### Índice

```sql
CREATE INDEX idx_atp_tax_id ON actor_tax_profiles (tax_id_type, tax_id_value)
WHERE tax_id_type IS NOT NULL AND tax_id_value IS NOT NULL;
```

### Ejemplos de inserción

```sql
-- RUC con dígito verificador (Panamá)
INSERT INTO actor_tax_profiles (actor_id, tax_id_type, tax_id_value, ruc, ruc_dv, fiscal_name)
VALUES ('<actor_id>', 'ruc_dv', '8-888-8888', '8-888-8888', '88', 'Empresa S.A.');

-- Cédula
INSERT INTO actor_tax_profiles (actor_id, tax_id_type, tax_id_value, fiscal_name)
VALUES ('<actor_id>', 'cedula', '8-888-8888', 'Juan Pérez');

-- Pasaporte
INSERT INTO actor_tax_profiles (actor_id, tax_id_type, tax_id_value, fiscal_name)
VALUES ('<actor_id>', 'pasaporte', 'AB123456', 'John Doe');
```

---

## C) Multi-Emisor: nueva firma de `emit_fiscal_invoice_from_source`

### Firma canónica (3 argumentos)

```sql
emit_fiscal_invoice_from_source(
    p_issuer_id     uuid,   -- emisor explícito (requerido)
    p_source_module text,   -- 'marketplace' | 'memberships' | 'donations'
    p_source_id     uuid    -- ID de la entidad fuente
) RETURNS uuid              -- ID del fiscal_document creado (o existente, idempotente)
```

**Comportamiento:**
- Verifica que el emisor existe y está activo.
- Aplica idempotencia: si ya existe una factura para `(source_module, source_id)`,
  devuelve el `id` existente sin crear duplicados.
- Maneja `unique_violation` para concurrencia: si dos sesiones simultáneas intentan
  crear la misma factura, la segunda devuelve la creada por la primera.
- Asigna `doc_number` automáticamente si existe una serie activa para el emisor/tipo.
  Formato: `<prefix>-<número_8_dígitos>`, ej. `FAC-00000001`.

### Wrapper legado (2 argumentos)

La firma original `emit_fiscal_invoice_from_source(p_source_module, p_source_id)` se
mantiene como wrapper para compatibilidad:

- Si hay **exactamente 1** emisor activo → delega a la versión de 3 argumentos.
- Si hay **0** emisores activos → lanza excepción clara.
- Si hay **>1** emisores activos → lanza excepción indicando que se debe usar la
  versión con `p_issuer_id`.

```
ERROR: Hay 3 emisores activos. Use emit_fiscal_invoice_from_source(p_issuer_id, p_source_module, p_source_id) especificando el emisor.
```

### Migración del código de aplicación

Si actualmente llamas a `emit_fiscal_invoice_from_source(module, id)` desde la app
o desde Edge Functions, y planeas operar más de un emisor, actualiza las llamadas:

```typescript
// Antes (MVP un emisor)
const { data } = await supabase.rpc('emit_fiscal_invoice_from_source', {
  p_source_module: 'marketplace',
  p_source_id: orderId,
});

// Después (multi-emisor)
const { data } = await supabase.rpc('emit_fiscal_invoice_from_source', {
  p_issuer_id: issuerId,       // ← nuevo parámetro
  p_source_module: 'marketplace',
  p_source_id: orderId,
});
```

---

## D) Hardening de `post_payment_to_journal`

### Mejoras en `00019_accounting_hardening.sql`

1. **`SET search_path = public`** — Previene ataques de search_path injection en
   funciones `SECURITY DEFINER`.

2. **Check de rol explícito** — La función ahora valida al inicio:
   ```sql
   IF NOT has_role('operador') THEN
       RAISE EXCEPTION 'Permiso insuficiente...';
   END IF;
   ```
   Permite: `operador`, `gestor`, `admin`, `superadmin` (jerarquía ≥ 3).
   Deniega: `auditor`, `viewer`.

3. **Manejo de `unique_violation`** — Si dos sesiones concurrentes intentan crear el
   asiento para el mismo pago simultáneamente, el bloque `EXCEPTION WHEN unique_violation`
   devuelve el asiento ya creado por la primera sesión en lugar de fallar con error.

---

## E) Aplicar las migraciones

```bash
# Con Supabase CLI (recomendado)
supabase db push

# Con psql (manual)
psql "$DATABASE_URL" -f supabase/migrations/00019_accounting_hardening.sql
psql "$DATABASE_URL" -f supabase/migrations/00020_fiscal_base_ext.sql
psql "$DATABASE_URL" -f supabase/migrations/00021_fiscal_core_multi_issuer.sql
```

### Orden y dependencias

```
00019_accounting_hardening
    ├── requiere: actors, profiles (existen desde 00006, 00004)
    ├── requiere: chart_of_accounts, journal_entries, accounting_mappings (00016)
    └── crea: actor_memberships, is_tenant_member()

00020_fiscal_base_ext
    ├── requiere: actor_tax_profiles, issuers (00017)
    ├── requiere: actors (00006)
    └── requiere: is_tenant_member() (00019)

00021_fiscal_core_multi_issuer
    ├── requiere: fiscal_documents, fiscal_numbering_series, etc. (00018)
    ├── requiere: issuers (00017)
    └── requiere: is_tenant_member() (00019)
```

La secuencia completa de migraciones queda:

```
00001 … 00015   (migraciones base existentes)
00016_accounting.sql
00017_fiscal_base.sql
00018_fiscal_core.sql
00019_accounting_hardening.sql     ← PR #31
00020_fiscal_base_ext.sql          ← PR #31
00021_fiscal_core_multi_issuer.sql ← PR #31
00022_multi_tenant_rls_lockdown.sql ← PR #33
00025_add_payment_id_to_sources.sql
```

---

## F) Lockdown estricto multi-tenant (PR #33 / migración 00022)

### Cambio de comportamiento: filas legacy con `tenant_actor_id IS NULL`

A partir de `00022_multi_tenant_rls_lockdown.sql`, las políticas RLS de todas las
tablas contables y fiscales eliminan el escape `OR tenant_actor_id IS NULL`.

**Antes (00019–00021):**
```sql
-- Cualquier rol podía ver filas sin tenant asignado
USING (
    has_role('admin')
    OR (tenant_actor_id IS NOT NULL AND is_tenant_member(...))
    OR tenant_actor_id IS NULL   -- ← escape eliminado
)
```

**Después (00022):**
```sql
-- Solo admin ve filas legacy (tenant NULL)
USING (
    has_role('admin')
    OR (tenant_actor_id IS NOT NULL AND is_tenant_member(...))
)
```

> ⚠️ **Advertencia**: Si tu base de datos tiene filas con `tenant_actor_id IS NULL`
> creadas antes de este lockdown, esas filas quedarán **invisibles para roles
> no-admin** hasta que se ejecute el backfill (ver sección siguiente).

### Guía de backfill: poblar `tenant_actor_id` en tablas existentes

Antes de aplicar la migración 00022 en producción, ejecuta el backfill
correspondiente a tu modelo de datos. Los scripts de ejemplo asumen que existe
un único tenant por ahora; ajústalos si ya tienes múltiples tenants.

```sql
-- ─── Variables de contexto ────────────────────────────────────────────────────
-- Reemplaza '<TENANT_ID>' con el UUID del actors.id de tu organización.

-- 1) chart_of_accounts
UPDATE chart_of_accounts
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 2) journal_entries
UPDATE journal_entries
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 3) accounting_mappings
UPDATE accounting_mappings
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 4) actor_tax_profiles
UPDATE actor_tax_profiles
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 5) issuers
UPDATE issuers
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 6) fiscal_numbering_series
UPDATE fiscal_numbering_series
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 7) fiscal_documents
UPDATE fiscal_documents
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 8) fiscal_document_lines
UPDATE fiscal_document_lines
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 9) fiscal_taxes
UPDATE fiscal_taxes
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 10) fiscal_withholdings
UPDATE fiscal_withholdings
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;

-- 11) fiscal_transmissions
UPDATE fiscal_transmissions
   SET tenant_actor_id = '<TENANT_ID>'
 WHERE tenant_actor_id IS NULL;
```

Para verificar cuántas filas quedan pendientes antes del backfill:

```sql
SELECT 'chart_of_accounts'     AS tabla, COUNT(*) AS pendientes FROM chart_of_accounts     WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'journal_entries',                COUNT(*)               FROM journal_entries         WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'accounting_mappings',            COUNT(*)               FROM accounting_mappings     WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'actor_tax_profiles',             COUNT(*)               FROM actor_tax_profiles      WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'issuers',                        COUNT(*)               FROM issuers                 WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_numbering_series',        COUNT(*)               FROM fiscal_numbering_series WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_documents',               COUNT(*)               FROM fiscal_documents        WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_document_lines',          COUNT(*)               FROM fiscal_document_lines   WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_taxes',                   COUNT(*)               FROM fiscal_taxes            WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_withholdings',            COUNT(*)               FROM fiscal_withholdings     WHERE tenant_actor_id IS NULL
UNION ALL
SELECT 'fiscal_transmissions',           COUNT(*)               FROM fiscal_transmissions    WHERE tenant_actor_id IS NULL;
```

### Propagación automática de tenant a partir de 00022

Después del lockdown, las funciones SECURITY DEFINER asignan tenant automáticamente:

| Función | Fuente del tenant |
|---------|-------------------|
| `post_payment_to_journal(payment_id)` | Inferido de `marketplace_orders.buyer_id`, `memberships.actor_id` o `donations.donor_actor_id` vía `payment_id` |
| `emit_fiscal_invoice_from_source(issuer_id, ...)` | Derivado de `issuers.tenant_actor_id` |

Si `post_payment_to_journal` no puede inferir el tenant (pago sin fuente vinculada),
lanza una excepción explícita en lugar de crear un asiento sin tenant.

### Aplicar la migración de lockdown

```bash
# Con Supabase CLI
supabase db push

# Con psql (ejecutar ANTES la migración si no está en el historial)
psql "$DATABASE_URL" -f supabase/migrations/00022_multi_tenant_rls_lockdown.sql
```

Orden completo de migraciones:

```
00001 … 00015   (base existente)
00016_accounting.sql
00017_fiscal_base.sql
00018_fiscal_core.sql
00019_accounting_hardening.sql
00020_fiscal_base_ext.sql
00021_fiscal_core_multi_issuer.sql
00022_multi_tenant_rls_lockdown.sql   ← NUEVO (PR #33)
00025_add_payment_id_to_sources.sql
```

---

## TODOs pendientes

- **`integration_outbox`**: `emit_fiscal_invoice_from_source` deja el documento en
  `ready_to_send`. Cuando exista una tabla/cola de outbox, encolar la transmisión al
  PAC/DGI automáticamente (ver comentario TODO en la función).

- **Migración de datos existentes**: Si hay filas en `actor_tax_profiles` con `ruc`
  pero sin `tax_id_type`, ejecutar:
  ```sql
  UPDATE actor_tax_profiles
     SET tax_id_type  = 'ruc_dv',
         tax_id_value = ruc
   WHERE ruc IS NOT NULL AND tax_id_type IS NULL;
  ```

- **Poblar `tenant_actor_id`**: Las filas creadas antes de esta migración tienen
  `tenant_actor_id = NULL`. Para asignarlas a un tenant:
  ```sql
  UPDATE fiscal_documents SET tenant_actor_id = '<tenant_id>' WHERE tenant_actor_id IS NULL;
  -- (ajustar según lógica de negocio)
  ```
