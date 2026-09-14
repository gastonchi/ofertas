import { createDbFromConfig } from "../lib/db/client";
import {
  argentinaTimeLabel,
  argentinaWeekday,
  isAlertSendTime,
} from "../lib/schedule";
import { offerMatchFromAlertRow } from "./alerts/from-row";
import { getCheckConfig, isDryRun, isForceAlert, isIgnoreSchedule } from "./config";
import {
  FALLBACK_JOB_SETTINGS,
  argentinaDay,
  loadJobSettings,
  listPendingAlertsForDay,
  markAlertsEmailed,
} from "./db";
import { sendAlertEmail } from "./notify/gmail";

export async function runSendAlerts(argv = process.argv): Promise<void> {
  const dryRun = isDryRun(argv);
  const forceSend = isForceAlert(argv) || isIgnoreSchedule(argv);
  const config = getCheckConfig(dryRun);

  const canUseDb = Boolean(config.supabaseUrl && config.supabaseKey);
  const db = canUseDb
    ? createDbFromConfig(config.supabaseUrl!, config.supabaseKey!)
    : null;
  if (!dryRun && !db) {
    throw new Error(
      "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios fuera de dry-run",
    );
  }

  const jobSettings = db
    ? await loadJobSettings(db, config.alertTo)
    : { ...FALLBACK_JOB_SETTINGS, alertEmail: config.alertTo };

  const shouldSend =
    forceSend ||
    isAlertSendTime(jobSettings.alertDays, jobSettings.alertHours);

  if (!shouldSend) {
    console.log(
      `Fuera de horario de email (AR ${argentinaWeekday()} ${argentinaTimeLabel()}). ` +
        `Config: ${jobSettings.alertDays.join(",")} @ ${jobSettings.alertHours.join(",")}.`,
    );
    return;
  }

  if (!db) {
    console.log("Sin base de datos; no hay alertas pendientes.");
    return;
  }

  const day = argentinaDay();
  const pending = await listPendingAlertsForDay(db, day);
  const matches = pending
    .map(offerMatchFromAlertRow)
    .filter((match): match is NonNullable<typeof match> => match !== null);

  if (matches.length === 0) {
    console.log(`Sin alertas pendientes de email para ${day}.`);
    return;
  }

  console.log(
    `Envío de alertas · día=${day} · pendientes=${matches.length}` +
      ` · horario=${jobSettings.alertHours.join(",")}` +
      ` · dryRun=${dryRun}`,
  );

  if (dryRun) {
    for (const match of matches) {
      console.log(`- ${match.trackedName}: ${match.triggers.map((t) => t.message).join(" | ")}`);
    }
    return;
  }

  const alertTo = jobSettings.alertEmail ?? config.alertTo;

  await sendAlertEmail({
    user: config.gmailUser!,
    appPassword: config.gmailAppPassword!,
    to: alertTo!,
    matches,
  });
  console.log(`Email enviado a ${alertTo} (${matches.length} ofertas)`);

  await markAlertsEmailed(db, pending.map((alert) => alert.id));
}
