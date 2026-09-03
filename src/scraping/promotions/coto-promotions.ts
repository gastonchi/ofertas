import type { PromotionInfo } from "../../lib/types";
import { computePromoPricing } from "../offers/pricing";
import { isPaymentOnlyPromo, looksLikePromoText } from "./text-patterns";

export type CotoDiscount = {
  id?: string;
  comments?: string;
  takingText?: string | null;
  discountText?: string;
  regularPrice?: string | null;
  discountImage?: string | null;
  discountPrice?: string;
  regularPriceText?: string;
};

function parseTakingQuantity(
  takingText: string | null | undefined,
): number | undefined {
  if (!takingText) return undefined;
  const match = takingText.match(/llevando\s+(\d+)/i);
  if (!match) return undefined;
  const qty = Number(match[1]);
  return Number.isFinite(qty) && qty > 0 ? qty : undefined;
}

/** Parsea montos tipo "$3.194,75", "$950.00" o "$950". */
export function parseCotoMoney(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return undefined;

  if (/,\d{1,2}$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? Math.round(value) : undefined;
  }

  const normalized = cleaned.replace(/,/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

function promoLabel(d: CotoDiscount): string {
  const discount = d.discountText?.trim();
  const taking = d.takingText?.trim();
  if (discount && taking) return `${discount} (${taking})`;
  return discount || taking || "";
}

export function extractCotoPromotions(
  discounts: CotoDiscount[] | undefined,
  shelfPrice: number,
): PromotionInfo[] {
  if (!discounts?.length || shelfPrice <= 0) return [];

  const seen = new Set<string>();
  const out: PromotionInfo[] = [];

  for (const discount of discounts) {
    const name = promoLabel(discount);
    if (!name) continue;

    const minimumQuantity = parseTakingQuantity(discount.takingText);
    const parseName = discount.discountText?.trim() || name;

    if (
      isPaymentOnlyPromo(parseName) &&
      !looksLikePromoText(parseName, minimumQuantity)
    ) {
      continue;
    }
    if (!looksLikePromoText(parseName, minimumQuantity)) continue;
    if (seen.has(name)) continue;
    seen.add(name);

    let pricing =
      computePromoPricing(parseName, shelfPrice, minimumQuantity) ?? undefined;
    const cotoUnit = parseCotoMoney(discount.discountPrice);

    if (cotoUnit != null) {
      const unitsToBuy = pricing?.unitsToBuy ?? minimumQuantity ?? 1;
      pricing = {
        summary: pricing?.summary ?? parseName,
        unitsToBuy,
        unitEffectivePrice: cotoUnit,
        totalToPay: Math.round(cotoUnit * unitsToBuy),
        validUntilLabel: pricing?.validUntilLabel,
      };
    }

    out.push({ name, minimumQuantity, pricing });
  }

  return out;
}
