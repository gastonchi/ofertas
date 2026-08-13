import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { listProducts } from "@/app/actions/products";
import { isAuthenticated } from "@/lib/auth";
import { formatArs, formatDateTime } from "@/lib/format";
import { STORE_LABELS } from "@/lib/stores";
import { createAdminDb, hasSupabaseConfig } from "@/lib/supabase";
import type { AlertRow, PriceHistoryRow, StoreId } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  if (!(await isAuthenticated()) || !hasSupabaseConfig()) {
    return {
      products: [],
      alerts: [] as AlertRow[],
      prices: [] as PriceHistoryRow[],
      configured: false,
    };
  }

  const [products, db] = await Promise.all([listProducts(), Promise.resolve(createAdminDb())]);

  const [{ data: alerts }, { data: prices }] = await Promise.all([
    db
      .from("alerts_sent")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(5),
    db
      .from("price_history")
      .select("id, ean, store, product_name, price, list_price, checked_at")
      .order("checked_at", { ascending: false })
      .limit(8),
  ]);

  return {
    products,
    alerts: (alerts ?? []) as AlertRow[],
    prices: (prices ?? []) as PriceHistoryRow[],
    configured: true,
  };
}

export default async function HomePage() {
  const { products, alerts, prices, configured } = await loadDashboard();
  const activeCount = products.filter((p) => p.active).length;

  return (
    <AdminShell title="Resumen" pathname="/">
      {!configured ? (
        <p className="setup-banner">
          Configurá Supabase y <code>ADMIN_PASSWORD</code> en las variables de
          entorno de Vercel (Root Directory: <code>admin</code>).
        </p>
      ) : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Productos activos</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="stat-card">
          <span>Total en catálogo</span>
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
                      (alert.payload?.triggers?.map((t) => t.message).join(" · ") ??
                        "Oferta")}
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
            Gestionar productos
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
    </AdminShell>
  );
}
