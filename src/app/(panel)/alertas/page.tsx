import { AlertsDataTable } from "@/components/alerts/alerts-data-table";
import { AppShell } from "@/components/layout/app-shell";
import { formatDay } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/env";
import {
  defaultAlertDateRange,
  resolveAlertDateRange,
} from "@/modules/alerts/date-range";
import { listAlertsInRange } from "@/modules/alerts/queries";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = resolveAlertDateRange(params.from, params.to);
  const { to: today } = defaultAlertDateRange();
  const alerts = hasSupabaseConfig()
    ? await listAlertsInRange(range.from, range.to)
    : [];
  const titleNote =
    range.from === range.to
      ? `(${formatDay(range.from)})`
      : `del ${formatDay(range.from)} al ${formatDay(range.to)}`;

  return (
    <AppShell title="Alertas" titleNote={titleNote} pathname="/alertas">
      <div className="panel">
        <AlertsDataTable
          alerts={alerts}
          from={range.from}
          to={range.to}
          max={today}
        />
      </div>
    </AppShell>
  );
}
