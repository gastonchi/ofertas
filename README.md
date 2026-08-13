# Ofertas (MVP personal)

Rastrea precios en supermercados VTEX (Carrefour, Día, Jumbo, Disco, Vea) por EAN, evalúa ofertas y te avisa a tu Gmail. Corre 2 veces al día con GitHub Actions.

## Qué detecta

1. Precio actual ≤ `target_price`
2. Descuento de lista (`ListPrice` > `Price`)
3. Promos en teasers VTEX (2do al %, 2x1, 3x2, etc.) — excluye descuentos solo de tarjeta

No reenvía el mismo aviso el mismo día (fingerprint en Supabase).

## Setup rápido

### 1. Repo

```bash
npm install
cp .env.example .env
```

### 2. Supabase (free)

1. Creá un proyecto en https://supabase.com
2. SQL Editor → pegá y ejecutá `supabase/schema.sql`
3. (Opcional) ejecutá `supabase/seed-products.sql` para cargar el MVP
4. Project Settings → API → copiá `Project URL` y la key `service_role`

### 3. Gmail App Password

1. Activá verificación en 2 pasos en tu cuenta Google
2. Andá a https://myaccount.google.com/apppasswords
3. Creá una contraseña de app (nombre: `ofertas`)
4. Usala en `GMAIL_APP_PASSWORD` (16 caracteres, sin tu password normal)

### 4. Variables (`.env`)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_USER` — tu Gmail
- `GMAIL_APP_PASSWORD` — App Password
- `ALERT_TO_EMAIL` — normalmente el mismo Gmail

### 5. Productos

Fuente preferida: tabla `tracked_products` (panel admin).

Fallback: `products.json`:

```json
[
  {
    "name": "Coca Cola 2,25 L",
    "ean": "7790895000997",
    "target_price": 5500,
    "stores": ["carrefour"]
  }
]
```

### 6. Probar

```bash
npm run check:dry   # sin email ni escritura requerida
npm run check       # consulta + guarda + manda mail si hay oferta
```

### 7. GitHub Actions

Repo privado → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `GMAIL_USER` | tu@gmail.com |
| `GMAIL_APP_PASSWORD` | App Password |
| `ALERT_TO_EMAIL` | tu@gmail.com |

Cron: 08:00 y 20:00 (Argentina). También: **Actions → Check offers → Run workflow**.

### 8. Panel admin (Vercel)

App en `admin/` (Next.js + TypeScript + Tailwind).

1. Nuevo proyecto en Vercel → este repo
2. **Root Directory:** `admin`
3. Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`
4. Detalle en [`admin/README.md`](admin/README.md)

Local:

```bash
cd admin
cp .env.example .env.local
npm install
npm run dev
```

## Estructura

- `src/stores/*` — clientes VTEX por tienda
- `src/offers/evaluate.ts` — reglas de oferta
- `src/db/supabase.ts` — historial, dedupe y productos
- `src/notify/gmail.ts` — email por SMTP
- `src/index.ts` — orquestación
- `admin/` — panel para editar EANs

## Próximos pasos

- Auth más robusta (p. ej. magic link)
- Gráficos de historial de precios
- Disparador manual del chequeo desde el panel
