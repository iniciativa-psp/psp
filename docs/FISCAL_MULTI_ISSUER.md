# FISCAL_MULTI_ISSUER — Guía de Multi-Emisor y Hardening

Repositorio: `iniciativa-psp/psp`  
Migraciones: `00019_accounting_hardening.sql`, `00020_fiscal_base_ext.sql`, `00021_fiscal_core_multi_issuer.sql`, `00022_multi_tenant_rls_lockdown.sql`

---

> ⚠️ **LOCKDOWN ESTRICTO (desde `00022`):** filas con `tenant_actor_id IS NULL`
> son visibles **solo para `has_role('admin')`**. Cualquier usuario sin ese rol
> global que no sea miembro de un tenant no verá datos contables ni fiscales.
> Antes de aplicar `00022`, ejecuta los scripts de backfill opcionales (ver
> sección [F](#f-backfill-opcional-poblar-tenant_actor_id)) para evitar pérdida
> de visibilidad sobre datos legados.

---

## Resumen de cambios (PR #31)

Este PR agrega tres migraciones incrementales sobre la base establecida en PR #30
(`00016`–`00018`). **No modifica las migraciones ya aplicadas.**

| Migración | Contenido principal |
|-----------|---------------------|
| `00019_accounting_hardening.sql` | `actor_memberships`, `tenant_actor_id` en tablas contables, hardening de `post_payment_to_journal` |
| `00020_fiscal_base_ext.sql` | `tax_id_type`/`tax_id_value` en `actor_tax_profiles`, `tenant_actor_id` en tablas fiscales base |
| `00021_fiscal_core_multi_issuer.sql` | Nueva firma multi-emisor de `emit_fiscal_invoice_from_source`, `doc_number` automático, `tenant_actor_id` en tablas fiscales core |
| `00022_multi_tenant_rls_lockdown.sql` | RLS lockdown estricto (tenant NULL → admin-only), inferencia de `tenant_actor_id` en `post_payment_to_journal`, eliminación de `EXCEPTION WHEN OTHERS` en emisión fiscal |

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

### Mejoras en `00022_multi_tenant_rls_lockdown.sql`

4. **Inferencia de `tenant_actor_id`** — La función ahora infiere el tenant desde las
   fuentes del pago y lo setea en `journal_entries.tenant_actor_id` al insertar:

   | Fuente | Ruta de inferencia |
   |--------|--------------------|
   | Marketplace | `marketplace_orders.payment_id` → `marketplace_order_items.seller_id` (single-seller) |
   | Membresías | `membership_invoices.payment_id` → `memberships.actor_id` |
   | Donaciones | **No se infiere** — `donor_actor_id` no es un tenant |

   > **Prerequisito:** La migración `00025_add_payment_id_to_sources.sql` debe estar
   > aplicada para que `marketplace_orders.payment_id` y `membership_invoices.payment_id`
   > existan. Sin ella, la inferencia nunca encontrará filas y la función fallará con
   > "No se pudo inferir tenant_actor_id".

   - Si el pedido tiene **más de 1 vendedor** distinto → excepción clara.
   - Si el pago es una **donación** → excepción clara (donor no es tenant).
   - Si no se puede inferir → excepción "no vinculado a marketplace ni membresías".

---

## E) Aplicar las migraciones

```bash
# Con Supabase CLI (recomendado)
supabase db push

# Con psql (manual)
psql "$DATABASE_URL" -f supabase/migrations/00019_accounting_hardening.sql
psql "$DATABASE_URL" -f supabase/migrations/00020_fiscal_base_ext.sql
psql "$DATABASE_URL" -f supabase/migrations/00021_fiscal_core_multi_issuer.sql
psql "$DATABASE_URL" -f supabase/migrations/00025_add_payment_id_to_sources.sql
psql "$DATABASE_URL" -f supabase/migrations/00022_multi_tenant_rls_lockdown.sql
```

> ⚠️ Ejecutar los scripts de backfill de la sección F **antes** de aplicar `00022`
> para evitar pérdida de visibilidad sobre datos sin `tenant_actor_id`.

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

00025_add_payment_id_to_sources
    ├── requiere: marketplace_orders (00015)
    ├── requiere: membership_invoices (00011)
    └── requiere: donations (00013)

00022_multi_tenant_rls_lockdown
    ├── requiere: is_tenant_member() (00019)
    ├── requiere: tenant_actor_id en tablas contables (00019)
    ├── requiere: tenant_actor_id en tablas fiscales (00020, 00021)
    └── requiere: payment_id en fuentes (00025) para inferencia en post_payment_to_journal
```

La secuencia completa de migraciones queda:

```
00001 … 00015   (migraciones base existentes)
00016_accounting.sql
00017_fiscal_base.sql
00018_fiscal_core.sql
00019_accounting_hardening.sql         ← PR #31
00020_fiscal_base_ext.sql              ← PR #31
00021_fiscal_core_multi_issuer.sql     ← PR #31
00025_add_payment_id_to_sources.sql
00022_multi_tenant_rls_lockdown.sql    ← PR #33 (este PR)
```

---

## F) Backfill opcional: poblar `tenant_actor_id`

> ⚠️ Estos scripts son **opcionales y manuales**. Ejecutarlos **antes** de aplicar
> la migración `00022` si existen filas legadas con `tenant_actor_id IS NULL` que
> deben seguir siendo visibles para usuarios no-admin tras el lockdown.
>
> **Validar siempre en entorno de staging antes de ejecutar en producción.**
> Los scripts no se ejecutan automáticamente como parte de ninguna migración.

### F.1) Backfill de `journal_entries` desde marketplace

Utiliza la ruta `marketplace_orders.payment_id → marketplace_order_items.seller_id`.
Solo actualiza órdenes con **exactamente 1 vendedor** distinto (órdenes multi-vendedor
quedan sin actualizar para revisión manual).

```sql
-- Ver cuántos asientos se actualizarían (dry-run)
SELECT je.id, je.source_id AS payment_id, sub.seller_id
FROM   journal_entries je
JOIN   (
    SELECT mo.payment_id, COUNT(DISTINCT moi.seller_id) AS seller_count,
           MIN(moi.seller_id)                            AS seller_id
    FROM   marketplace_orders mo
    JOIN   marketplace_order_items moi ON moi.order_id = mo.id
    WHERE  mo.payment_id IS NOT NULL
    GROUP  BY mo.payment_id
    HAVING COUNT(DISTINCT moi.seller_id) = 1
) sub ON sub.payment_id = je.source_id
WHERE  je.source_type       = 'payment'
  AND  je.tenant_actor_id IS NULL;

-- Actualizar (ejecutar solo tras revisar el dry-run)
UPDATE journal_entries je
   SET tenant_actor_id = sub.seller_id
FROM   (
    SELECT mo.payment_id, MIN(moi.seller_id) AS seller_id
    FROM   marketplace_orders mo
    JOIN   marketplace_order_items moi ON moi.order_id = mo.id
    WHERE  mo.payment_id IS NOT NULL
    GROUP  BY mo.payment_id
    HAVING COUNT(DISTINCT moi.seller_id) = 1
) sub
WHERE  je.source_type       = 'payment'
  AND  je.source_id         = sub.payment_id
  AND  je.tenant_actor_id IS NULL;
```

### F.2) Backfill de `journal_entries` desde membresías

Utiliza la ruta `membership_invoices.payment_id → memberships.actor_id`.

```sql
-- Ver cuántos asientos se actualizarían (dry-run)
SELECT je.id, je.source_id AS payment_id, m.actor_id AS tenant_actor_id
FROM   journal_entries je
JOIN   membership_invoices mi ON mi.payment_id = je.source_id
JOIN   memberships m           ON m.id         = mi.membership_id
WHERE  je.source_type       = 'payment'
  AND  je.tenant_actor_id IS NULL;

-- Actualizar (ejecutar solo tras revisar el dry-run)
UPDATE journal_entries je
   SET tenant_actor_id = m.actor_id
FROM   membership_invoices mi
JOIN   memberships m ON m.id = mi.membership_id
WHERE  je.source_type       = 'payment'
  AND  je.source_id         = mi.payment_id
  AND  je.tenant_actor_id IS NULL;
```

### F.3) Backfill de `fiscal_documents`, `actor_tax_profiles`, etc.

Para tablas fiscales con `tenant_actor_id IS NULL`, asignar el tenant correcto
según la lógica de negocio de cada organización:

```sql
-- Ejemplo genérico (ajustar WHERE según lógica real)
UPDATE fiscal_documents
   SET tenant_actor_id = '<UUID_del_tenant>'
 WHERE tenant_actor_id IS NULL;

UPDATE actor_tax_profiles
   SET tenant_actor_id = '<UUID_del_tenant>'
 WHERE tenant_actor_id IS NULL;

UPDATE issuers
   SET tenant_actor_id = '<UUID_del_tenant>'
 WHERE tenant_actor_id IS NULL;
```

### F.4) Donaciones — nota

Los asientos contables (si los hay) relacionados con donaciones **no tienen backfill
automático** porque `donor_actor_id` no es un tenant. Para donaciones, la visibilidad
de sus `journal_entries` asociadas tras el lockdown requerirá asignación manual del
`tenant_actor_id` apropiado (por ejemplo, la organización receptora de la donación).

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

- **Poblar `tenant_actor_id`**: Las filas creadas antes de estas migraciones tienen
  `tenant_actor_id = NULL`. Con el lockdown de `00022`, estas filas serán visibles
  **solo para admin**. Ver sección [F](#f-backfill-opcional-poblar-tenant_actor_id)
  para los scripts de backfill recomendados.
