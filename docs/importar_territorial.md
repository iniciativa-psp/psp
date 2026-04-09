# Importar datos territoriales a Supabase

Este documento describe cómo importar los datos de la División Político-Administrativa
de Panamá (desde el repositorio `pobrezapanama/Territorial`) a la base de datos Supabase
del proyecto SIG-PSP.

## Origen de los datos

Los datos provienen del archivo
[`panama_full_geography.clean.json`](https://github.com/pobrezapanama/Territorial/blob/main/panama_full_geography.clean.json)
del repositorio Territorial.

El JSON contiene la jerarquía completa:
- Provincias (nivel 1)
- Distritos (nivel 2)
- Corregimientos (nivel 3)
- Comunidades (nivel 4)

## Pasos de importación

### Opción A — Script Node.js (recomendado)

1. Descarga el archivo JSON:

```bash
curl -L https://raw.githubusercontent.com/pobrezapanama/Territorial/main/panama_full_geography.clean.json \
  -o /tmp/panama_full_geography.clean.json
```

2. Crea el script de importación:

```ts
// scripts/import-territorial.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface GeoItem {
  id: number
  name: string
  slug?: string
  code?: string
  type: string
  parent_id: number | null
  level: number
}

const raw = JSON.parse(readFileSync('/tmp/panama_full_geography.clean.json', 'utf-8'))

// Aplanar la jerarquía en un array de filas
const rows: GeoItem[] = []

for (const province of raw) {
  rows.push({ id: province.id, name: province.name, slug: province.slug ?? '', code: province.code ?? '', type: 'province', parent_id: null, level: 1 })
  for (const district of province.districts ?? []) {
    rows.push({ id: district.id, name: district.name, slug: district.slug ?? '', code: district.code ?? '', type: 'district', parent_id: province.id, level: 2 })
    for (const corregimiento of district.corregimientos ?? []) {
      rows.push({ id: corregimiento.id, name: corregimiento.name, slug: corregimiento.slug ?? '', code: corregimiento.code ?? '', type: 'corregimiento', parent_id: district.id, level: 3 })
      for (const community of corregimiento.communities ?? []) {
        rows.push({ id: community.id, name: community.name, slug: community.slug ?? '', code: community.code ?? '', type: 'community', parent_id: corregimiento.id, level: 4 })
      }
    }
  }
}

// Insertar en lotes de 500
const BATCH = 500
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('territorial_items').upsert(batch, { onConflict: 'id' })
  if (error) {
    console.error(`Error en lote ${i}-${i + BATCH}:`, error.message)
  } else {
    console.log(`Insertados registros ${i + 1}–${Math.min(i + BATCH, rows.length)}`)
  }
}

console.log('Importación completada.')
```

3. Ejecuta el script:

```bash
npx tsx scripts/import-territorial.ts
```

### Opción B — SQL directo en Supabase SQL Editor

Si prefieres importar directamente, convierte el JSON a sentencias `INSERT` y ejecútalas
en el SQL Editor de tu proyecto Supabase.

```sql
-- Ejemplo de una provincia:
INSERT INTO territorial_items (id, name, slug, code, type, parent_id, level)
VALUES (1, 'Bocas del Toro', 'bocas-del-toro', '1', 'province', NULL, 1)
ON CONFLICT (id) DO NOTHING;
```

## Verificar la importación

Después de importar, ejecuta estas consultas para verificar:

```sql
-- Conteo por tipo
SELECT type, COUNT(*) FROM territorial_items GROUP BY type ORDER BY level;

-- Verificar provincias
SELECT * FROM v_provincias;

-- Buscar una comunidad de prueba
SELECT * FROM search_territorial('Changuinola', NULL, 5);
```

## Resolución de problemas

**Error: `unaccent` extension not found**
```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Error: `pg_trgm` extension not found** (necesaria para el índice gin_trgm_ops)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

> En Supabase Cloud, ambas extensiones están disponibles desde el panel
> **Database → Extensions**.
