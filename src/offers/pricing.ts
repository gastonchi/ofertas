export type PromoPricing = {
  /** Etiqueta corta, ej. "2do al 50%" */
  summary: string;
  unitsToBuy: number;
  totalToPay: number;
  /** Precio promedio por unidad aplicando la promo */
  unitEffectivePrice: number;
  /** Texto de vigencia si se pudo inferir, ej. "hasta el 10/08" */
  validUntilLabel?: string;
};

function roundMoney(n: number): number {
  return Math.round(n);
}

/** Intenta leer fechas tipo "al 10.8", "hasta 10/08", "hasta el 10-8-2026". */
export function parseValidUntilLabel(name: string): string | undefined {
  const patterns = [
    /hasta(?:\s+el)?\s+(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/i,
    /(?:^|[^\w])al\s+(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\s*%)/i,
  ];

  for (const re of patterns) {
    const m = name.match(re);
    if (!m) continue;
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    return `hasta el ${dd}/${mm}`;
  }

  return undefined;
}

/**
 * Calcula precio a pagar según el nombre de la promo VTEX.
 * Ej.: 2do al 50% con precio 5800 → total 8700 / $4350 c/u.
 */
export function computePromoPricing(
  name: string,
  shelfPrice: number,
  minimumQuantity?: number,
): PromoPricing | null {
  if (shelfPrice <= 0) return null;

  const validUntilLabel = parseValidUntilLabel(name);

  const secondAt = name.match(/2(?:do|[°º]|da)\s*al\s*(\d+(?:[.,]\d+)?)\s*%/i);
  if (secondAt) {
    const pct = Number(secondAt[1].replace(",", "."));
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      const unitsToBuy = Math.max(2, minimumQuantity ?? 2);
      // La promo clásica es en múltiplos de 2: 2da unidad al X%.
      const pairs = Math.floor(unitsToBuy / 2);
      const remainder = unitsToBuy % 2;
      const pairCost = shelfPrice + shelfPrice * (1 - pct / 100);
      const totalToPay = roundMoney(pairs * pairCost + remainder * shelfPrice);
      return {
        summary: `2do al ${pct}%`,
        unitsToBuy,
        totalToPay,
        unitEffectivePrice: roundMoney(totalToPay / unitsToBuy),
        validUntilLabel,
      };
    }
  }

  const nxm = name.match(/\b(\d)\s*[x×]\s*(\d)\b/i);
  if (nxm) {
    const take = Number(nxm[1]);
    const pay = Number(nxm[2]);
    if (take > pay && pay >= 1) {
      const unitsToBuy = Math.max(take, minimumQuantity ?? take);
      const sets = Math.floor(unitsToBuy / take);
      const remainder = unitsToBuy % take;
      const totalToPay = roundMoney(sets * pay * shelfPrice + remainder * shelfPrice);
      return {
        summary: `${take}x${pay}`,
        unitsToBuy,
        totalToPay,
        unitEffectivePrice: roundMoney(totalToPay / unitsToBuy),
        validUntilLabel,
      };
    }
  }

  return validUntilLabel
    ? {
        summary: "promo",
        unitsToBuy: minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1,
        totalToPay: roundMoney(shelfPrice * (minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1)),
        unitEffectivePrice: roundMoney(shelfPrice),
        validUntilLabel,
      }
    : null;
}
