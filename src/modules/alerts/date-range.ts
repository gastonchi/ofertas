import { argentinaDay } from "@/scraping/db";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function atArgentinaNoon(day: string): Date {
  return new Date(`${day}T12:00:00.000-03:00`);
}

function shiftDay(day: string, deltaDays: number): string {
  const next = new Date(
    atArgentinaNoon(day).getTime() + deltaDays * 24 * 60 * 60 * 1000,
  );
  return argentinaDay(next);
}

export function isYmd(value: string | undefined): value is string {
  if (!value || !YMD.test(value)) return false;
  return argentinaDay(atArgentinaNoon(value)) === value;
}

export function defaultAlertDateRange(): { from: string; to: string } {
  const to = argentinaDay();
  return { from: shiftDay(to, -6), to };
}

export function resolveAlertDateRange(
  fromParam?: string,
  toParam?: string,
): { from: string; to: string } {
  const fallback = defaultAlertDateRange();
  let from = isYmd(fromParam) ? fromParam : fallback.from;
  let to = isYmd(toParam) ? toParam : fallback.to;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}
