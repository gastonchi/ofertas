export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
  sat: "Sáb",
  sun: "Dom",
};

export const DEFAULT_ALERT_DAYS: Weekday[] = [...WEEKDAYS];
export const DEFAULT_ALERT_HOURS = ["08:00", "20:00"];

/** Tolerancia del cron de email (cada 15 min) respecto al horario configurado. */
export const ALERT_SEND_TOLERANCE_MINUTES = 14;

const TZ = "America/Argentina/Buenos_Aires";

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function parseWeekdays(values: FormDataEntryValue[]): Weekday[] {
  const days = values.map(String).filter(isWeekday);
  return days.length > 0 ? days : [...DEFAULT_ALERT_DAYS];
}

export function normalizeTimeLabel(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Acepta "9", "09:30" o "09:00". */
export function normalizeHourLabel(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return normalizeTimeLabel(trimmed);
  }

  const match = trimmed.match(/^(\d{1,2})$/);
  if (!match) return null;
  let hour = Number(match[1]);
  if (hour === 24) hour = 0;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:00`;
}

export function parseAlertHours(values: FormDataEntryValue[]): string[] {
  const hours = [
    ...new Set(
      values
        .map(String)
        .map(normalizeHourLabel)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  return hours.length > 0 ? hours : [...DEFAULT_ALERT_HOURS];
}

export function argentinaWeekday(date = new Date()): Weekday {
  const short = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TZ,
  })
    .format(date)
    .slice(0, 3)
    .toLowerCase();

  return isWeekday(short) ? short : "mon";
}

export function argentinaTimeLabel(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return normalizeTimeLabel(`${hour}:${minute}`) ?? "00:00";
}

/** @deprecated Usar argentinaTimeLabel */
export function argentinaHourLabel(date = new Date()): string {
  return argentinaTimeLabel(date);
}

export function timeLabelToMinutes(label: string): number | null {
  const normalized = normalizeHourLabel(label);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

export function isAlertSendTime(
  days: readonly string[],
  times: readonly string[],
  date = new Date(),
  toleranceMinutes = ALERT_SEND_TOLERANCE_MINUTES,
): boolean {
  const enabledDays = days.filter(isWeekday);
  const enabledTimes = times
    .map(normalizeHourLabel)
    .filter((value): value is string => Boolean(value));
  const checkDays = enabledDays.length > 0 ? enabledDays : DEFAULT_ALERT_DAYS;
  const checkTimes =
    enabledTimes.length > 0 ? enabledTimes : DEFAULT_ALERT_HOURS;

  if (!checkDays.includes(argentinaWeekday(date))) {
    return false;
  }

  const nowMinutes = timeLabelToMinutes(argentinaTimeLabel(date));
  if (nowMinutes === null) return false;

  return checkTimes.some((time) => {
    const slotMinutes = timeLabelToMinutes(time);
    if (slotMinutes === null) return false;
    return Math.abs(nowMinutes - slotMinutes) <= toleranceMinutes;
  });
}

/** Compat: ventana por hora en punto (sin minutos). */
export function isInAlertWindow(
  days: readonly string[],
  hours: readonly string[],
  date = new Date(),
): boolean {
  const enabledHours = hours
    .map(normalizeHourLabel)
    .filter((value): value is string => Boolean(value));
  const hourOnly = enabledHours.map((time) => time.slice(0, 2) + ":00");
  return isAlertSendTime(days, hourOnly, date, 0);
}
