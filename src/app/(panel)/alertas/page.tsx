import { AlertsList } from "@/components/alerts/alerts-list";
import { AppShell } from "@/components/layout/app-shell";
import { formatWeekdayDate } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/env";
import {
  defaultAlertDay,
  resolveAlertDay,
} from "@/modules/alerts/date-range";
import { listAlertsForDay } from "@/modules/alerts/queries";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; from?: string }>;
}) {
  const params = await searchParams;
  const day = resolveAlertDay(params.day, params.from);
  const today = defaultAlertDay();
  const alerts = hasSupabaseConfig() ? await listAlertsForDay(day) : [];
  const titleNote = `(${formatWeekdayDate(`${day}T12:00:00.000-03:00`)})`;

  return (
    <AppShell title="Alertas" titleNote={titleNote} pathname="/alertas">
      <div className="panel">
        <AlertsList alerts={alerts} day={day} max={today} />
      </div>
    </AppShell>
  );
}
