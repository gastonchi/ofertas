import { createDbFromConfig } from "../lib/db/client";
import {
  ALERT_SHIFT_LABELS,
  argentinaShift,
  argentinaTimeLabel,
  argentinaWeekday,
  isAlertSendTime,
} from "../lib/schedule";
import { offerMatchFromAlertRow } from "./alerts/from-row";
import { getSendAlertsConfig, isDryRun, isForceAlert, isIgnoreSchedule } from "./config";
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
  const config = getSendAlertsConfig(dryRun);

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

  const shift = argentinaShift();
  const shouldSend =
    forceSend ||
    isAlertSendTime(jobSettings.alertDays, jobSettings.alertHours);

  if (!shouldSend) {
    const shiftLabel = shift ? ALERT_SHIFT_LABELS[shift] : "fuera de turno";
    console.log(
      `Fuera de turno de email (AR ${argentinaWeekday()} ${argentinaTimeLabel()}, ${shiftLabel}). ` +
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
    console.log(
      `Sin alertas pendientes de email para ${day}` +
        (shift ? ` (turno ${ALERT_SHIFT_LABELS[shift]})` : "") +
        ".",
    );
    return;
  }

  console.log(
    `Envío de alertas · día=${day}` +
      (shift ? ` · turno=${ALERT_SHIFT_LABELS[shift]}` : "") +
      ` · pendientes=${matches.length}` +
      ` · turnos config=${jobSettings.alertHours.join(",")}` +
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
