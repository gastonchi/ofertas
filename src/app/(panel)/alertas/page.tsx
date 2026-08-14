import { AppShell } from "@/components/layout/app-shell";
import { formatArs, formatDateTime } from "@/lib/format";
import { STORE_LABELS } from "@/lib/stores";
import type { StoreId } from "@/lib/types";
import { listRecentAlerts } from "@/modules/alerts/queries";
import { hasSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = hasSupabaseConfig() ? await listRecentAlerts(40) : [];

  return (
    <AppShell title="Alertas" pathname="/alertas">
      <div className="panel">
        {alerts.length === 0 ? (
          <p className="empty-state">Todavía no hay alertas enviadas.</p>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => {
              const name =
                alert.payload?.trackedName ??
                alert.payload?.snapshot?.productName ??
                alert.ean;
              const triggers =
                alert.payload?.triggers?.map((t) => t.message).join(" · ") ??
                "Oferta detectada";
              const price = alert.payload?.snapshot?.price;
              const storeLabel =
                STORE_LABELS[alert.store as StoreId] ?? alert.store;

              return (
                <article key={alert.id} className="alert-item">
                  <div>
                    <strong>{name}</strong>
                    <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                      {storeLabel} · {triggers}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>
                      {typeof price === "number" ? formatArs(price) : "—"}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {formatDateTime(alert.sent_at)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
