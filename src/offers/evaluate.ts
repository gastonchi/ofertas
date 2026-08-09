import type { OfferMatch, OfferSnapshot, OfferTrigger, TrackedProduct } from "../types.js";

function roundPct(list: number, price: number): number {
  if (list <= 0) return 0;
  return Math.round(((list - price) / list) * 1000) / 10;
}

function promoMessage(
  name: string,
  shelfPrice: number,
  pricing?: OfferSnapshot["promotions"][number]["pricing"],
): string {
  if (!pricing || (pricing.summary === "promo" && !pricing.validUntilLabel)) {
    return `Promo activa: ${name}`;
  }

  if (pricing.summary === "promo") {
    return `Promo activa: ${name} · ${pricing.validUntilLabel}`;
  }

  const vigencia = pricing.validUntilLabel ? ` · ${pricing.validUntilLabel}` : "";
  return (
    `${pricing.summary}: góndola $${shelfPrice} → con oferta $${pricing.unitEffectivePrice} c/u` +
    ` (llevando ${pricing.unitsToBuy} pagás $${pricing.totalToPay})${vigencia}`
  );
}

export function evaluateOffer(
  tracked: TrackedProduct,
  snapshot: OfferSnapshot,
): OfferMatch | null {
  if (!snapshot.available || snapshot.price <= 0) {
    return null;
  }

  const triggers: OfferTrigger[] = [];

  if (snapshot.price <= tracked.target_price) {
    triggers.push({
      type: "below_target",
      message: `Precio $${snapshot.price} ≤ objetivo $${tracked.target_price}`,
    });
  }

  if (snapshot.listPrice > snapshot.price) {
    const discountPct = roundPct(snapshot.listPrice, snapshot.price);
    // Algunas APIs VTEX (Cencosud) devuelven ListPrice basura (~99%).
    // Solo avisamos descuentos de lista plausibles.
    if (discountPct >= 5 && discountPct <= 70) {
      triggers.push({
        type: "list_discount",
        message: `Descuento de lista ${discountPct}% ($${snapshot.listPrice} → $${snapshot.price})`,
        discountPct,
      });
    }
  }

  for (const promo of snapshot.promotions) {
    triggers.push({
      type: "promotion",
      message: promoMessage(promo.name, snapshot.price, promo.pricing),
      promotionName: promo.name,
    });
  }

  if (triggers.length === 0) {
    return null;
  }

  const fingerprintParts = triggers.map((t) => {
    if (t.type === "below_target") return `target:${snapshot.price}`;
    if (t.type === "list_discount") return `list:${snapshot.listPrice}->${snapshot.price}`;
    return `promo:${t.promotionName}`;
  });

  return {
    snapshot,
    trackedName: tracked.name,
    targetPrice: tracked.target_price,
    triggers,
    fingerprint: fingerprintParts.sort().join("|"),
  };
}
