import { AdminShell } from "@/components/admin-shell";
import { createAdminDb, hasSupabaseConfig } from "@/lib/supabase";
import { formatArs, formatDateTime } from "@/lib/format";
import { STORE_LABELS } from "@/lib/stores";
import type { AlertRow, StoreId } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function loadAlerts(): Promise<AlertRow[]> {
  if (!(await isAuthenticated()) || !hasSupabaseConfig()) return [];
  const db = createAdminDb();
  const { data, error } = await db
    .from("alerts_sent")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertRow[];
}

export default async function AlertsPage() {
  const alerts = await loadAlerts();

  return (
    <AdminShell title="Alertas" pathname="/alertas">
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
    </AdminShell>
  );
}
