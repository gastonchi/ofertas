import Link from "next/link";
import { AlertCard } from "@/components/alerts/alert-card";
import { PriceCard } from "@/components/alerts/price-card";
import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseConfig } from "@/lib/env";
import { listRecentAlerts, listRecentPrices } from "@/modules/alerts/queries";
import { listProducts } from "@/modules/products/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = hasSupabaseConfig();
  const products = configured ? await listProducts() : [];
  const alerts = configured ? await listRecentAlerts(5) : [];
  const prices = configured ? await listRecentPrices(8) : [];
  const activeCount = products.filter((p) => p.active).length;

  return (
    <AppShell title="Inicio" pathname="/">
      {!configured ? (
        <p className="setup-banner">
          Configurá <code>SUPABASE_URL</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> en Vercel.
        </p>
      ) : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Productos activos</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="stat-card">
          <span>En seguimiento</span>
          <strong>{products.length}</strong>
        </article>
        <article className="stat-card">
          <span>Alertas recientes</span>
          <strong>{alerts.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Últimas alertas</h2>
          <Link href="/alertas" className="btn-ghost">
            Ver todas
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="empty-state">Sin alertas todavía.</p>
        ) : (
          <div className="card-grid">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Últimos precios</h2>
          <Link href="/productos" className="btn-ghost">
            Mis productos
          </Link>
        </div>
        {prices.length === 0 ? (
          <p className="empty-state">Todavía no hay historial de precios.</p>
        ) : (
          <div className="card-grid">
            {prices.map((row) => (
              <PriceCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
