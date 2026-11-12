export const MIN_CREDIT_CARD_INSTALLMENTS = 1;
export const MAX_CREDIT_CARD_INSTALLMENTS = 24;

/** Prefijo de `notes` en cuotas generadas desde el wizard con TC. */
export const CREDIT_CARD_NOTE_PREFIX = "TC cuota";

export function isCreditCardInstallmentNote(notes: string | null): boolean {
  return Boolean(notes?.startsWith(CREDIT_CARD_NOTE_PREFIX));
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Suma meses conservando el día; si no existe (ej. 31 → feb), usa el último del mes. */
export function addMonthsSameDay(ymd: string, months: number): string {
  const { year, month, day } = parseYmd(ymd);
  let m = month + months;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  const d = Math.min(day, lastDayOfMonth(y, m));
  return formatYmd(y, m, d);
}

/** Reparte enteros; el resto se suma en las primeras cuotas. */
export function splitAmountInInstallments(
  total: number,
  count: number,
): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

/** Primera cuota = mismo día del mes siguiente a la compra. */
export function creditCardInstallmentSchedule(
  purchaseDate: string,
  installmentCount: number,
  totalAmount: number,
): { spentOn: string; amount: number; index: number }[] {
  const amounts = splitAmountInInstallments(totalAmount, installmentCount);
  return amounts.map((amount, index) => ({
    spentOn: addMonthsSameDay(purchaseDate, index + 1),
    amount,
    index: index + 1,
  }));
}

export function formatInstallmentNote(
  index: number,
  total: number,
  userNotes: string,
  maxLength = 500,
): string {
  const prefix = `${CREDIT_CARD_NOTE_PREFIX} ${index}/${total}`;
  const trimmed = userNotes.trim();
  const combined = trimmed ? `${prefix} · ${trimmed}` : prefix;
  return combined.length <= maxLength
    ? combined
    : combined.slice(0, maxLength);
}

export function isValidInstallmentCount(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= MIN_CREDIT_CARD_INSTALLMENTS &&
    (value as number) <= MAX_CREDIT_CARD_INSTALLMENTS
  );
}
