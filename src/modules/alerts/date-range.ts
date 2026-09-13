import { argentinaDay } from "@/scraping/db";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function atArgentinaNoon(day: string): Date {
  return new Date(`${day}T12:00:00.000-03:00`);
}

export function shiftAlertDay(day: string, deltaDays: number): string {
  const next = new Date(
    atArgentinaNoon(day).getTime() + deltaDays * 24 * 60 * 60 * 1000,
  );
  return argentinaDay(next);
}

export function isYmd(value: string | undefined): value is string {
  if (!value || !YMD.test(value)) return false;
  return argentinaDay(atArgentinaNoon(value)) === value;
}

export function defaultAlertDay(): string {
  return argentinaDay();
}

export function resolveAlertDay(
  dayParam?: string,
  legacyFromParam?: string,
): string {
  if (isYmd(dayParam)) return dayParam;
  if (isYmd(legacyFromParam)) return legacyFromParam;
  return defaultAlertDay();
}
