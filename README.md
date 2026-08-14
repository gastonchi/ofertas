# Ofertas

App Next.js para seguir productos de supermercado, detectar ofertas y avisar por email.

Una sola app: panel de usuario + job de scraping. Un `package.json`, un `node_modules`.

## Qué hace

1. Cargás productos (nombre, EAN, precio objetivo, tiendas)
2. Un job consulta Carrefour, Día, Jumbo, Disco y Vea
3. Si hay oferta (precio ≤ objetivo, descuento de lista o promo), te llega un mail
4. En el panel ves productos, alertas y configuración

## Estructura

```
src/
  app/                 rutas (Inicio, Productos, Alertas, Configuración)
  components/          UI por dominio
  lib/                 auth, db, tipos compartidos
  modules/             acciones de productos / alertas / settings
  scraping/            clientes VTEX, reglas de oferta, email
  jobs/                CLI: npm run check
supabase/              schema SQL
.cursor/rules/         arquitectura y UI responsive (agentes / Cursor)
```

En desktop las listas anchas van en tabla; en celular (< 768px) la misma info se muestra en cards. Detalle en `.cursor/rules/`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Variables:

| Variable | Uso |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `ADMIN_PASSWORD` | contraseña del panel |
| `GMAIL_USER` | Gmail SMTP |
| `GMAIL_APP_PASSWORD` | App Password |
| `ALERT_TO_EMAIL` | destino de alertas (fallback) |

En Supabase SQL Editor:

1. `supabase/schema.sql`
2. (opcional) `supabase/seed-products.sql`

```bash
npm run dev          # panel en http://localhost:3000
npm run check:dry    # scraping sin email
npm run check        # scraping + historial + mail
```

## Vercel

**Root Directory:** vacío (la raíz del repo, no `admin/`).

Si ya habías importado con Root Directory `admin`, cambialo a `.` o dejalo vacío y redesplegá.

Mismas env vars que arriba.

## GitHub Actions

Cron 08:00 y 20:00 (Argentina). Secrets iguales a las env de Vercel (salvo `ADMIN_PASSWORD`).
