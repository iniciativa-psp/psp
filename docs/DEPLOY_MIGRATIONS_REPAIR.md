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

## Cómo aplicar las migraciones en orden

Las migraciones deben aplicarse de forma secuencial respetando su numeración.
Si usas **Supabase CLI**:

```bash
# Asegúrate de estar autenticado y conectado al proyecto correcto
supabase db push
```

Si aplicas manualmente con `psql`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/00016_accounting.sql
psql "$DATABASE_URL" -f supabase/migrations/00017_fiscal_base.sql
psql "$DATABASE_URL" -f supabase/migrations/00018_fiscal_core.sql
```

> **Importante:** las migraciones deben ejecutarse en el orden numérico indicado porque
> `00018_fiscal_core.sql` referencia tablas creadas en `00017_fiscal_base.sql` (`issuers`,
> `actor_tax_profiles`), y `00016_accounting.sql` referencia `payment_concepts` y
> `payments` que existen desde `00002_pagos.sql`.

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
00016_accounting.sql          ← NUEVO (reparación)
00017_fiscal_base.sql         ← NUEVO (reparación)
00018_fiscal_core.sql         ← NUEVO (reparación)
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

- **Emisor activo (MVP)**: La RPC `emit_fiscal_invoice_from_source` toma el primer
  emisor activo del sistema. En un escenario multi-emisor, deberá recibir `p_issuer_id`
  como parámetro o resolverlo desde la entidad fuente.
