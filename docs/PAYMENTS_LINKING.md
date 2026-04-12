# PAYMENTS_LINKING.md

## Enlace de Pagos con Fuentes (`payment_id`)

### ¿Por qué existe este campo?

Cada cobro en el sistema puede originarse desde tres módulos distintos:

| Módulo | Tabla fuente |
|---|---|
| Marketplace | `marketplace_orders` |
| Membresías | `membership_invoices` |
| Donaciones | `donations` |

Para poder emitir documentos fiscales (PR #29) y generar asientos contables
consistentes (PR #26) se necesita una relación explícita y determinística entre
el pago (`payments.id`) y la entidad que lo originó.

Sin este vínculo, confirmar un pago no sabría automáticamente a qué orden,
factura o donación corresponde, lo que impediría la emisión fiscal correcta.

---

### Reglas de diseño

1. **Un pago → máximo una fuente.** Las columnas `payment_id` en las tres
   tablas fuente tienen restricción `UNIQUE (payment_id) WHERE payment_id IS NOT NULL`.
   Esto garantiza que un mismo pago no pueda estar vinculado a dos órdenes, dos
   facturas, ni a una orden y una donación al mismo tiempo.

2. **La fuente guarda la referencia, no el pago.** La FK vive en la tabla
   fuente (`marketplace_orders.payment_id`, etc.) y apunta hacia `payments.id`.
   Si el pago se elimina, la columna se pone en `NULL` (`ON DELETE SET NULL`).

3. **Vinculación en el mismo flujo de creación.** Al crear el pago desde
   cualquiera de los tres módulos, el `payment_id` se debe escribir en la tabla
   fuente inmediatamente después (o en la misma transacción cuando sea posible).

4. **Confirmación de pago valida el vínculo.** La función `confirmPayment` en
   `src/lib/pagos/api.ts` verifica si hay una entidad fuente vinculada antes de
   marcar el pago como `completed`. Si no la encuentra, devuelve
   `source_linked: false` y registra una advertencia; el llamador debe omitir la
   emisión fiscal automática.

---

### Cómo vincular en cada módulo

#### Marketplace (checkout)

```typescript
import { createPayment } from '@/lib/pagos/api'
import { linkPaymentToOrder } from '@/lib/marketplace/api'

// 1. Crear el pago
const payment = await createPayment({ /* ... */ })

// 2. Vincular al pedido
await linkPaymentToOrder(orderId, payment.id)
```

#### Membresías (factura de cobro)

```typescript
import { createPayment } from '@/lib/pagos/api'
import { createMembershipInvoice, linkPaymentToMembershipInvoice } from '@/lib/membresias/api'

// 1. Crear la factura
const invoice = await createMembershipInvoice({ /* ... */ })

// 2. Crear el pago
const payment = await createPayment({ /* ... */ })

// 3. Vincular
await linkPaymentToMembershipInvoice(invoice.id, payment.id)
```

#### Donaciones

```typescript
import { createPayment } from '@/lib/pagos/api'
import { linkPaymentToDonation } from '@/lib/donaciones/api'

// 1. La donación ya existe (puede crearse antes del pago)
// 2. Crear el pago
const payment = await createPayment({ /* ... */ })

// 3. Vincular
await linkPaymentToDonation(donationId, payment.id)
```

#### Confirmar pago

```typescript
import { confirmPayment } from '@/lib/pagos/api'

const result = await confirmPayment(paymentId, 'Pago recibido por transferencia')

if (!result.source_linked) {
  // No hay entidad fuente vinculada → NO emitir fiscal automáticamente
  console.warn('Pago confirmado sin fuente vinculada:', paymentId)
} else {
  // result.source_module: 'marketplace' | 'memberships' | 'donations'
  // result.source_id: id de la entidad fuente
  // → Proceder con emisión fiscal (PR #29)
}
```

---

### Backfill de datos existentes

La migración `00025_add_payment_id_to_sources.sql` agrega las columnas con
valor `NULL` por defecto. Los registros históricos quedarán sin vincular hasta
que se ejecute un backfill manual.

#### Marketplace

Si los pedidos existentes tienen un código de referencia de pago en
`marketplace_orders.payment_reference` que coincide con
`payments.reference_code`, ejecutar:

```sql
UPDATE marketplace_orders mo
   SET payment_id = p.id
  FROM payments p
 WHERE p.reference_code = mo.payment_reference
   AND mo.payment_id IS NULL
   AND mo.payment_reference IS NOT NULL;
```

> ⚠️ Validar antes de ejecutar que `reference_code` en `payments` es único
> y corresponde 1:1 con `payment_reference` en `marketplace_orders`.

#### Membresías

```sql
UPDATE membership_invoices mi
   SET payment_id = p.id
  FROM payments p
 WHERE p.reference_code = mi.invoice_number
   AND mi.payment_id IS NULL;
```

> ⚠️ Solo aplica si los pagos de membresías registran el número de factura en
> `payments.reference_code`.

#### Donaciones

No existe columna de referencia homologable entre `donations` y `payments`.
El backfill debe realizarse caso por caso usando la fecha de donación, el actor
donante y el monto para identificar el pago correspondiente, o bien mediante
un proceso de importación manual coordinado con el equipo de operaciones.

---

### Índices y constraints creados

| Tabla | Columna | Tipo |
|---|---|---|
| `marketplace_orders` | `payment_id` | `UUID NULL REFERENCES payments(id) ON DELETE SET NULL` |
| `marketplace_orders` | `payment_id` | `UNIQUE (payment_id) WHERE payment_id IS NOT NULL` |
| `marketplace_orders` | `payment_id` | `INDEX` |
| `membership_invoices` | `payment_id` | `UUID NULL REFERENCES payments(id) ON DELETE SET NULL` |
| `membership_invoices` | `payment_id` | `UNIQUE (payment_id) WHERE payment_id IS NOT NULL` |
| `membership_invoices` | `payment_id` | `INDEX` |
| `donations` | `payment_id` | `UUID NULL REFERENCES payments(id) ON DELETE SET NULL` |
| `donations` | `payment_id` | `UNIQUE (payment_id) WHERE payment_id IS NOT NULL` |
| `donations` | `payment_id` | `INDEX` |
