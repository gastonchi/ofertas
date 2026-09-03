import type { PromotionInfo } from "./types";

export type PromoPricingInfo = NonNullable<PromotionInfo["pricing"]>;

export function hasComputedUnitPrice(
  pricing: PromoPricingInfo | undefined,
): boolean {
  return (
    !!pricing &&
    pricing.summary !== "promo" &&
    Number.isFinite(pricing.unitEffectivePrice)
  );
}

export function parsePromotions(raw: unknown): PromotionInfo[] {
  if (!Array.isArray(raw)) return [];
  const out: PromotionInfo[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;

    const minimumQuantity =
      typeof record.minimumQuantity === "number" &&
      Number.isFinite(record.minimumQuantity)
        ? record.minimumQuantity
        : undefined;

    let pricing: PromotionInfo["pricing"];
    if (record.pricing && typeof record.pricing === "object") {
      const p = record.pricing as Record<string, unknown>;
      const summary = typeof p.summary === "string" ? p.summary : "";
      const unitsToBuy = Number(p.unitsToBuy);
      const totalToPay = Number(p.totalToPay);
      const unitEffectivePrice = Number(p.unitEffectivePrice);
      if (
        summary &&
        Number.isFinite(unitsToBuy) &&
        Number.isFinite(totalToPay) &&
        Number.isFinite(unitEffectivePrice)
      ) {
        pricing = {
          summary,
          unitsToBuy,
          totalToPay,
          unitEffectivePrice,
          validUntilLabel:
            typeof p.validUntilLabel === "string"
              ? p.validUntilLabel
              : undefined,
        };
      }
    }

    out.push({ name, minimumQuantity, pricing });
  }

  return out;
}

/** Entre promos con pricing calculado, elige la de menor precio unitario. */
export function bestPromo(
  promotions: PromotionInfo[] | undefined | null,
): PromotionInfo | undefined {
  if (!promotions?.length) return undefined;

  const withUnitPrice = promotions.filter((p) => hasComputedUnitPrice(p.pricing));
  if (withUnitPrice.length === 0) {
    return promotions.find((p) => p.pricing) ?? promotions[0];
  }

  return withUnitPrice.reduce((best, promo) => {
    const bestPrice = best.pricing!.unitEffectivePrice;
    const nextPrice = promo.pricing!.unitEffectivePrice;
    return nextPrice < bestPrice ? promo : best;
  });
}

export function effectiveUnitPrice(
  shelfPrice: number,
  promotions: PromotionInfo[] | undefined | null,
): {
  effective: number;
  bestPromotion?: PromotionInfo;
  hasPromo: boolean;
} {
  const promo = bestPromo(promotions);
  const promoUnit = hasComputedUnitPrice(promo?.pricing)
    ? promo!.pricing!.unitEffectivePrice
    : null;

  if (promoUnit != null && promoUnit < shelfPrice) {
    return { effective: promoUnit, bestPromotion: promo, hasPromo: true };
  }

  return { effective: shelfPrice, bestPromotion: promo, hasPromo: false };
}
