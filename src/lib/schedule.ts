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

const TZ = "America/Argentina/Buenos_Aires";

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function parseWeekdays(values: FormDataEntryValue[]): Weekday[] {
  const days = values.map(String).filter(isWeekday);
  return days.length > 0 ? days : [...DEFAULT_ALERT_DAYS];
}

export function normalizeHourLabel(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
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

export function argentinaHourLabel(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(date);
  const raw = parts.find((part) => part.type === "hour")?.value ?? "00";
  return normalizeHourLabel(raw) ?? "00:00";
}

export function isInAlertWindow(
  days: readonly string[],
  hours: readonly string[],
  date = new Date(),
): boolean {
  const enabledDays = days.filter(isWeekday);
  const enabledHours = hours
    .map(normalizeHourLabel)
    .filter((value): value is string => Boolean(value));
  const checkDays = enabledDays.length > 0 ? enabledDays : DEFAULT_ALERT_DAYS;
  const checkHours =
    enabledHours.length > 0 ? enabledHours : DEFAULT_ALERT_HOURS;

  return (
    checkDays.includes(argentinaWeekday(date)) &&
    checkHours.includes(argentinaHourLabel(date))
  );
}
