import { AlertsDataTable } from "@/components/alerts/alerts-data-table";
import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseConfig } from "@/lib/env";
import { listRecentAlerts } from "@/modules/alerts/queries";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = hasSupabaseConfig() ? await listRecentAlerts(40) : [];

  return (
    <AppShell title="Alertas" pathname="/alertas">
      {alerts.length === 0 ? (
        <p className="empty-state">Todavía no hay alertas enviadas.</p>
      ) : (
        <div className="panel">
          <AlertsDataTable alerts={alerts} />
        </div>
      )}
    </AppShell>
  );
}
