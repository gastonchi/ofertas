# Ofertas Admin

Panel Next.js (TypeScript + Tailwind) para gestionar productos, ver alertas e historial de precios.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase (`tracked_products`, `alerts_sent`, `price_history`)

## Setup local

```bash
cd admin
cp .env.example .env.local
npm install
npm run dev
```

Variables en `.env.local`:

| Variable | Uso |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (solo server) |
| `ADMIN_PASSWORD` | Contraseña del panel |

Antes de usar el panel, en Supabase SQL Editor ejecutá:

1. `supabase/schema.sql` (incluye `tracked_products`)
2. `supabase/seed-products.sql` (opcional, carga el MVP)

## Deploy en Vercel

1. Creá un proyecto nuevo en Vercel apuntando a este repo
2. **Root Directory:** `admin`
3. Framework preset: Next.js
4. Environment Variables: las tres de arriba
5. Deploy

El job de GitHub Actions (`npm run check`) lee productos activos desde `tracked_products`. Si la tabla está vacía, cae a `products.json`.

## Rutas

- `/login` — acceso con `ADMIN_PASSWORD`
- `/` — resumen
- `/productos` — CRUD de EANs / precio objetivo / tiendas
- `/alertas` — historial de mails enviados
