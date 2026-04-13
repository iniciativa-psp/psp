# DEPLOY_MIGRATIONS_REPAIR

## ¿Por qué existe este PR?

Los PRs 26, 27 y 28 del repositorio `iniciativa-psp/psp` fueron mergeados a `main`
pero **no incluyeron archivos de migración SQL** en `supabase/migrations/`.
Como resultado, el esquema contable y fiscal diseñado nunca fue materializado en la base
de datos y el repositorio quedó en un estado no deployable para esas funcionalidades.

Este PR de reparación agrega las tres migraciones faltantes:

| Archivo | Contenido |
|---------|-----------|
| `00016_accounting.sql` | Plan de cuentas, asientos contables, mapeos, RPC `post_payment_to_journal` |
| `00017_fiscal_base.sql` | Perfiles fiscales de actores (`actor_tax_profiles`) y emisores (`issuers`) |
| `00018_fiscal_core.sql` | Núcleo de facturación PAC-agnóstico: series, documentos, líneas, impuestos, retenciones, transmisiones, log de eventos, reglas paramétricas, RPCs |

## Aplicación de migraciones (nota importante sobre dependencias)

En general, las migraciones deben aplicarse de forma secuencial respetando su numeración.
Si usas **Supabase CLI**, aplica el historial completo con:

```bash
# Asegúrate de estar autenticado y conectado al proyecto correcto
supabase db push
```

### ⚠️ Excepción operativa (dependencias por `payment_id`)
Aunque las migraciones están numeradas, **algunos flujos funcionales** (por ejemplo `post_payment_to_journal(payment_id)`)
dependen de que existan columnas `payment_id` en las tablas fuente (`marketplace_orders`, `membership_invoices`, `donations`).

Por eso, si vas a ejecutar o probar **posting contable basado en `payment_id`**, asegúrate de que la migración
`00025_add_payment_id_to_sources.sql` ya fue aplicada **antes** de ejecutar esos flujos (incluso si aplicas manualmente
con `psql`).

### Aplicación manual con psql (base + hardening)

```bash
# PR #30 — migraciones base
psql "$DATABASE_URL" -f supabase/migrations/00016_accounting.sql
psql "$DATABASE_URL" -f supabase/migrations/00017_fiscal_base.sql
psql "$DATABASE_URL" -f supabase/migrations/00018_fiscal_core.sql

# PR #31 — hardening + multi-issuer (incrementales)
psql "$DATABASE_URL" -f supabase/migrations/00019_accounting_hardening.sql
psql "$DATABASE_URL" -f supabase/migrations/00020_fiscal_base_ext.sql
psql "$DATABASE_URL" -f supabase/migrations/00021_fiscal_core_multi_issuer.sql

# Dependencia para flujos basados en payment_id (posting / inferencia)
psql "$DATABASE_URL" -f supabase/migrations/00025_add_payment_id_to_sources.sql

# Fix de inferencia de tenant (tenant = seller/issuer) para post_payment_to_journal
psql "$DATABASE_URL" -f supabase/migrations/00023_fix_post_payment_tenant_inference.sql
```

> Nota: `00023_fix_post_payment_tenant_inference.sql` reemplaza la función `post_payment_to_journal` para que el
> `tenant_actor_id` se derive del **seller/issuer**. Con el esquema actual, memberships y donations requerirán
> modelar explícitamente issuer/recipient/tenant para automatizar el posting.

## Nota sobre numeración

El archivo `00025_add_payment_id_to_sources.sql` ya existe en el repositorio (PR 29).
Las nuevas migraciones usan los números `00016`–`00018` que estaban libres en la secuencia
`00015` → `00025`. **No se renumeran las migraciones existentes.**

La secuencia definitiva queda:

```
00001_territorial.sql
00002_pagos.sql
00003_seed_data.sql
00004_auth_profiles_roles.sql
00005_territorial_expansion.sql
00006_actores.sql
00007_estrategia.sql
00008_dim_tiempo.sql
00009_empleos.sql
00010_oportunidades.sql
00011_membresias.sql
00012_rrhh_voluntariado_lms.sql
00013_donaciones_patrocinios.sql
00014_desarrollo_economico.sql
00015_marketplace.sql
00016_accounting.sql               ← NUEVO (PR #30 – reparación)
00017_fiscal_base.sql              ← NUEVO (PR #30 – reparación)
00018_fiscal_core.sql              ← NUEVO (PR #30 – reparación)
00019_accounting_hardening.sql     ← NUEVO (PR #31 – hardening)
00020_fiscal_base_ext.sql          ← NUEVO (PR #31 – identificación fiscal)
00021_fiscal_core_multi_issuer.sql ← NUEVO (PR #31 – multi-emisor)
00025_add_payment_id_to_sources.sql
```

Si en el futuro se agregan migraciones entre `00018` y `00025`, usar `00019`–`00024`.

## Dependencias y orden lógico

```
00002_pagos         (payments, payment_concepts)
    └── 00016_accounting   (chart_of_accounts, journal_entries, accounting_mappings)

00006_actores       (actors)
    └── 00017_fiscal_base  (actor_tax_profiles, issuers)
        └── 00018_fiscal_core  (fiscal_documents, fiscal_numbering_series, ...)

00015_marketplace / 00011_membresias / 00013_donaciones
    └── 00025_add_payment_id_to_sources  (payment_id FK)
    └── 00018_fiscal_core  (emit_fiscal_invoice_from_source usa marketplace_orders, membership_invoices, donations)
```

## TODOs documentados

- **`current_actor_id()`**: La política RLS de `actor_tax_profiles` podría permitir
  que cada actor lea su propio perfil fiscal si existiera un helper `current_actor_id()`.
  Actualmente se omite para no romper la migración; cuando el helper se implemente,
  agregar la condición `OR actor_id = current_actor_id()` en la policy `atp_select`.

- **`integration_outbox`**: La RPC `emit_fiscal_invoice_from_source` deja el documento
  en estado `ready_to_send`. Cuando exista una tabla `integration_outbox` u otro
  mecanismo de colas, encolar aquí la transmisión automática al PAC/DGI (ver comentario
  TODO en el cuerpo de la función).

- **Multi-emisor (PR #31)**: La RPC `emit_fiscal_invoice_from_source(source_module, source_id)`
  ahora es un wrapper seguro que falla explícitamente si hay 0 o más de 1 emisor activo.
  Para escenarios multi-emisor, usar la nueva firma
  `emit_fiscal_invoice_from_source(p_issuer_id, p_source_module, p_source_id)`.
  Ver `docs/FISCAL_MULTI_ISSUER.md` para guía de migración y uso.
