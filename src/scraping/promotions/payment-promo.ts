import { isPaymentOnlyPromo } from "./text-patterns";

const RE_WEEKDAY =
  /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i;

/** Teaser VTEX/Coto condicionado a tarjeta, banco, etc. — no modifica precio de góndola. */
export function formatPaymentPromoLabel(raw: string): string {
  const text = raw.trim();
  const pctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:off|dto\.?)?/i);
  const pct = pctMatch?.[1]?.replace(",", ".");

  const weekdayMatch = text.match(RE_WEEKDAY);
  const weekday = weekdayMatch?.[1]?.toLowerCase();

  const cardMatch = text.match(/tarjeta\s+([a-záéíóúñ0-9\s]+)/i);
  const cardName = cardMatch?.[1]?.trim().replace(/\s+\d.*$/i, "").trim();

  if (pct) {
    const base = cardName
      ? `${pct}% dto con Tarjeta ${cardName}`
      : `${pct}% dto con tarjeta / medio de pago`;
    return weekday ? `${base} los ${weekday}` : base;
  }

  if (/tarjeta\s+carrefour/i.test(text)) {
    return weekday
      ? `Dto con Tarjeta Carrefour los ${weekday}`
      : "Dto con Tarjeta Carrefour";
  }

  return text;
}

export function paymentPromoLabelFromNames(names: string[]): string | undefined {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || !isPaymentOnlyPromo(trimmed)) continue;
    const label = formatPaymentPromoLabel(trimmed);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  if (labels.length === 0) return undefined;
  return labels.join(" · ");
}
