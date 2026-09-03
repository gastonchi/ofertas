import {
  classifyPromoText,
  type ClassifiedPromoText,
} from "../promotions/text-patterns";

export type PromoPricing = {
  /** Etiqueta corta, ej. "2do al 50%" */
  summary: string;
  unitsToBuy: number;
  totalToPay: number;
  /** Precio promedio por unidad aplicando la promo */
  unitEffectivePrice: number;
  /** Texto de vigencia si se pudo inferir, ej. "hasta el 10/08" */
  validUntilLabel?: string;
  /** Clasificación del texto parseado */
  kind?: ClassifiedPromoText["kind"];
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

function pricingFromSecondUnit(
  percent: number,
  shelfPrice: number,
  minimumQuantity: number | undefined,
  validUntilLabel?: string,
): PromoPricing {
  const unitsToBuy = Math.max(2, minimumQuantity ?? 2);
  const pairs = Math.floor(unitsToBuy / 2);
  const remainder = unitsToBuy % 2;
  const pairCost = shelfPrice + shelfPrice * (1 - percent / 100);
  const totalToPay = roundMoney(pairs * pairCost + remainder * shelfPrice);
  return {
    summary: `2do al ${percent}%`,
    unitsToBuy,
    totalToPay,
    unitEffectivePrice: roundMoney(totalToPay / unitsToBuy),
    validUntilLabel,
    kind: "second_unit_percent",
  };
}

function pricingFromNxm(
  take: number,
  pay: number,
  shelfPrice: number,
  minimumQuantity: number | undefined,
  validUntilLabel?: string,
): PromoPricing {
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
    kind: "nxm",
  };
}

function pricingFromDirectPercent(
  percent: number,
  shelfPrice: number,
  minimumQuantity: number | undefined,
  validUntilLabel?: string,
  ambiguous = false,
): PromoPricing {
  const unitsToBuy = minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1;
  const unitEffectivePrice = roundMoney(shelfPrice * (1 - percent / 100));
  return {
    summary: ambiguous ? `hasta ${percent}% dto` : `${percent}% dto`,
    unitsToBuy,
    totalToPay: roundMoney(unitEffectivePrice * unitsToBuy),
    unitEffectivePrice,
    validUntilLabel,
    kind: ambiguous ? "ambiguous" : "direct_percent",
  };
}

/**
 * Calcula precio a pagar según el nombre de la promo VTEX / cluster / Coto.
 * Ej.: 2do al 50% con precio 5800 → total 8700 / $4350 c/u.
 */
export function computePromoPricing(
  name: string,
  shelfPrice: number,
  minimumQuantity?: number,
): PromoPricing | null {
  if (shelfPrice <= 0) return null;

  const validUntilLabel = parseValidUntilLabel(name);
  const classified = classifyPromoText(name);

  if (classified.kind === "payment_only" || classified.kind === "loyalty") {
    return validUntilLabel
      ? {
          summary: "promo",
          unitsToBuy: minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1,
          totalToPay: roundMoney(shelfPrice * (minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1)),
          unitEffectivePrice: roundMoney(shelfPrice),
          validUntilLabel,
          kind: classified.kind,
        }
      : null;
  }

  if (classified.kind === "nxm" && classified.take != null && classified.pay != null) {
    return pricingFromNxm(
      classified.take,
      classified.pay,
      shelfPrice,
      minimumQuantity,
      validUntilLabel,
    );
  }

  if (classified.kind === "second_unit_percent" && classified.percent != null) {
    return pricingFromSecondUnit(
      classified.percent,
      shelfPrice,
      minimumQuantity,
      validUntilLabel,
    );
  }

  if (
    (classified.kind === "direct_percent" || classified.kind === "ambiguous") &&
    classified.percent != null
  ) {
    return pricingFromDirectPercent(
      classified.percent,
      shelfPrice,
      minimumQuantity,
      validUntilLabel,
      classified.kind === "ambiguous",
    );
  }

  return validUntilLabel
    ? {
        summary: "promo",
        unitsToBuy: minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1,
        totalToPay: roundMoney(shelfPrice * (minimumQuantity && minimumQuantity > 0 ? minimumQuantity : 1)),
        unitEffectivePrice: roundMoney(shelfPrice),
        validUntilLabel,
        kind: "ambiguous",
      }
    : null;
}
