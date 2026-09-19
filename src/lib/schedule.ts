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

/** Turnos de envío (hora Argentina). Amplios a propósito: GitHub no dispara cada 15 min. */
export const ALERT_SHIFTS = ["morning", "afternoon", "evening"] as const;
export type AlertShift = (typeof ALERT_SHIFTS)[number];

export const ALERT_SHIFT_LABELS: Record<AlertShift, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  evening: "Noche",
};

export const ALERT_SHIFT_RANGES: Record<
  AlertShift,
  { startHour: number; endHour: number; hint: string }
> = {
  morning: { startHour: 6, endHour: 12, hint: "6:00 – 12:00" },
  afternoon: { startHour: 12, endHour: 18, hint: "12:00 – 18:00" },
  evening: { startHour: 18, endHour: 24, hint: "18:00 – 24:00" },
};

export const DEFAULT_ALERT_DAYS: Weekday[] = [...WEEKDAYS];
/** Por defecto: mañana y noche (equivalente aproximado a 08:00 / 20:00). */
export const DEFAULT_ALERT_SHIFTS: AlertShift[] = ["morning", "evening"];

/** @deprecated Usar DEFAULT_ALERT_SHIFTS */
export const DEFAULT_ALERT_HOURS = DEFAULT_ALERT_SHIFTS;

const TZ = "America/Argentina/Buenos_Aires";

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function isAlertShift(value: string): value is AlertShift {
  return (ALERT_SHIFTS as readonly string[]).includes(value);
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

/** Convierte un horario HH:MM legado al turno correspondiente. */
export function shiftFromHourLabel(raw: string): AlertShift | null {
  if (isAlertShift(raw)) return raw;
  const normalized = normalizeHourLabel(raw);
  if (!normalized) return null;
  const hour = Number(normalized.slice(0, 2));
  return shiftFromHour(hour);
}

export function shiftFromHour(hour: number): AlertShift | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (hour < ALERT_SHIFT_RANGES.morning.startHour) return null;
  if (hour < ALERT_SHIFT_RANGES.afternoon.startHour) return "morning";
  if (hour < ALERT_SHIFT_RANGES.evening.startHour) return "afternoon";
  return "evening";
}

export function parseAlertShifts(values: FormDataEntryValue[]): AlertShift[] {
  const shifts = [
    ...new Set(
      values
        .map(String)
        .map(shiftFromHourLabel)
        .filter((value): value is AlertShift => Boolean(value)),
    ),
  ];
  return shifts.length > 0 ? shifts : [...DEFAULT_ALERT_SHIFTS];
}

/** @deprecated Usar parseAlertShifts */
export function parseAlertHours(values: FormDataEntryValue[]): string[] {
  return parseAlertShifts(values);
}

export function normalizeAlertShifts(values: unknown): AlertShift[] {
  if (!Array.isArray(values)) return [...DEFAULT_ALERT_SHIFTS];
  const shifts = [
    ...new Set(
      values
        .map(String)
        .map(shiftFromHourLabel)
        .filter((value): value is AlertShift => Boolean(value)),
    ),
  ];
  return shifts.length > 0 ? shifts : [...DEFAULT_ALERT_SHIFTS];
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

export function hourFromTimeLabel(label: string): string | null {
  const normalized = normalizeHourLabel(label);
  if (!normalized) return null;
  return normalized.slice(0, 2);
}

export function argentinaHour(date = new Date()): string {
  return hourFromTimeLabel(argentinaTimeLabel(date)) ?? "00";
}

export function argentinaShift(date = new Date()): AlertShift | null {
  const hour = Number(argentinaHour(date));
  return shiftFromHour(hour);
}

/**
 * ¿Corresponde enviar ahora? Día habilitado + turno actual (mañana/tarde/noche)
 * entre los turnos configurados. No depende de un minuto exacto.
 */
export function isAlertSendTime(
  days: readonly string[],
  shiftsOrHours: readonly string[],
  date = new Date(),
): boolean {
  const enabledDays = days.filter(isWeekday);
  const enabledShifts = normalizeAlertShifts(shiftsOrHours);
  const checkDays = enabledDays.length > 0 ? enabledDays : DEFAULT_ALERT_DAYS;

  if (!checkDays.includes(argentinaWeekday(date))) {
    return false;
  }

  const current = argentinaShift(date);
  if (!current) return false;
  return enabledShifts.includes(current);
}

/** @deprecated Usar isAlertSendTime */
export function isInAlertWindow(
  days: readonly string[],
  hours: readonly string[],
  date = new Date(),
): boolean {
  return isAlertSendTime(days, hours, date);
}
