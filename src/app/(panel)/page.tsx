import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseConfig } from "@/lib/env";
import { formatArs, formatDateTime } from "@/lib/format";
import { STORE_LABELS } from "@/lib/stores";
import type { StoreId } from "@/lib/types";
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
          <div className="alert-list">
            {alerts.map((alert) => (
              <article key={alert.id} className="alert-item">
                <div>
                  <strong>
                    {alert.payload?.trackedName ??
                      alert.payload?.snapshot?.productName ??
                      alert.ean}
                  </strong>
                  <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                    {(STORE_LABELS[alert.store as StoreId] ?? alert.store) +
                      " · " +
                      (alert.payload?.triggers
                        ?.map((t) => t.message)
                        .join(" · ") ?? "Oferta")}
                  </p>
                </div>
                <div className="muted">{formatDateTime(alert.sent_at)}</div>
              </article>
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
          <div className="price-list">
            {prices.map((row) => (
              <article key={row.id} className="price-item">
                <div>
                  <strong>{row.product_name ?? row.ean}</strong>
                  <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                    {STORE_LABELS[row.store as StoreId] ?? row.store} ·{" "}
                    <code className="mono">{row.ean}</code>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{formatArs(Number(row.price))}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {formatDateTime(row.checked_at)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
