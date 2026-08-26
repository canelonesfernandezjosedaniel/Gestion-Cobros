# Esquema de Supabase

Este directorio contiene la migration lista para aplicar cuando se conecte
Supabase. Hoy la app **no tiene ningún dato integrado**: `lib/db.js` y
`context/AuthContext.js` son stubs (ver comentarios `TODO` en cada archivo)
que no leen ni escriben nada hasta que se complete la migración descrita aquí.

## Cómo aplicar

1. Crear el proyecto en [supabase.com](https://supabase.com) (o levantar uno
   local con `supabase start` si tienes la CLI).
2. Copiar `.env.example` a `.env.local` y completar:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
3. Aplicar la migration:
   - Con la CLI de Supabase: `supabase link --project-ref <tu-project-ref>` y
     luego `supabase db push`.
   - O pegando el contenido de
     [`migrations/20260825000000_init_schema.sql`](migrations/20260825000000_init_schema.sql)
     en el SQL Editor del dashboard de Supabase y ejecutándolo.
4. En **Authentication → Providers**, habilitar Email (y Google si se va a
   usar `loginGoogle`).
5. Recién en este punto reemplazar los stubs:
   - `lib/db.js` → queries reales contra las tablas de abajo usando el
     cliente `supabase` de `lib/supabase.js`.
   - `context/AuthContext.js` → `supabase.auth.signInWithPassword`,
     `signInWithOAuth({ provider: 'google' })`, `onAuthStateChange`,
     `signOut`.
   - `middleware.js` → validar la sesión real de Supabase (idealmente con
     `@supabase/ssr`) en vez de la cookie manual `app_auth_session`.

Cualquier cambio posterior al esquema debe hacerse como una migration nueva
en `supabase/migrations/`, nunca editando esta ni el dashboard a mano sin
dejar constancia aquí.

## Diseño

Todas las tablas tienen RLS activado y una columna `user_id` (con
`default auth.uid()`) para que cada persona solo pueda leer/escribir sus
propios datos — aunque hoy la app restringe el login a un único correo
(`ALLOWED_EMAIL` en `context/AuthContext.js`), este diseño no rompe si en el
futuro se habilita más de un usuario.

## Tablas y mapeo con Firestore

La app anterior guardaba estos datos en Firestore. Cada tabla nueva
reemplaza a la colección indicada; los nombres de campo se mantuvieron
iguales cuando fue posible para minimizar cambios en el código que los
consume.

### `ventas` (antes colección `ventas`)

| Columna      | Tipo                         | Notas                                        |
|--------------|-------------------------------|-----------------------------------------------|
| `id`         | uuid, PK                     | antes era el id de documento de Firestore (`_fbId`) |
| `user_id`    | uuid, FK → `auth.users`      | dueño del registro                            |
| `fecha`      | date                          | antes string `'YYYY-MM-DD'`                   |
| `cliente`    | text                          | nombre del cliente (texto libre)              |
| `producto`   | text, nullable                |                                                |
| `precio`     | numeric(12,2)                 |                                                |
| `cantidad`   | numeric(12,2)                 |                                                |
| `total`      | numeric(12,2)                 |                                                |
| `status`     | text                          | `'Pagado' \| 'Debe' \| 'Presupuesto'`         |
| `created_at` / `updated_at` | timestamptz     | `updated_at` se mantiene con trigger          |

### `pagos` (antes colección `pagos`)

| Columna     | Tipo           | Notas |
|-------------|----------------|-------|
| `id`        | uuid, PK       |       |
| `user_id`   | uuid, FK       |       |
| `fecha`     | date           |       |
| `cliente`   | text           |       |
| `monto_usd` | numeric(12,2)  |       |
| `monto_bs`  | numeric(12,2)  |       |
| `tasa`      | numeric(12,4)  | tasa BCV EUR usada al registrar el pago |
| `nota`      | text, nullable |       |
| `created_at`| timestamptz    | los pagos no se editan, por eso no tiene `updated_at` |

### `clientes` (antes colección `clientes_config`)

| Columna     | Tipo        | Notas |
|-------------|-------------|-------|
| `id`        | uuid, PK    |       |
| `user_id`   | uuid, FK    |       |
| `nombre`    | text        | antes era el id del documento; ahora es `unique (user_id, nombre)` |
| `telefono`  | text, nullable |    |
| `created_at` / `updated_at` | timestamptz | |

### `app_config` (antes colección `app_config`, un documento por clave)

Almacén clave/valor genérico. Clave primaria compuesta `(user_id, key)`.

| Clave (`key`)            | Contenido de `value`                                    |
|---------------------------|----------------------------------------------------------|
| `inventory`               | JSON: `{ [producto]: { stock: number, minStock: number } }` |
| `inv_history`              | JSON: array de movimientos de inventario (últimos 500)   |
| `product_catalog`          | JSON: `{ [producto]: { precio: number, desc: string } }` |
| `next_shipment_checks`     | JSON: `{ [rowKey]: true }` — checklist de próximo envío  |
| `wa_template`              | texto plano — plantilla de mensaje de WhatsApp            |

`value` se guarda siempre como texto (igual que en Firestore, donde estos
campos ya viajaban como JSON serializado); el cliente sigue siendo
responsable de hacer `JSON.parse`/`JSON.stringify` como ya hace hoy en
`context/AppContext.js`.

## Pendiente (fuera de esta migration)

- Políticas de Storage si en algún momento se suben imágenes de productos.
- Reemplazar los stubs de `lib/db.js` y `context/AuthContext.js` (ver
  "Cómo aplicar" arriba) — a propósito no se tocan hasta que el proyecto de
  Supabase exista.
