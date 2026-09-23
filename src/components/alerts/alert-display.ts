import {
  effectiveUnitPrice,
  parsePromotions,
  splitOnlineExclusivePromotion,
  splitPaymentPromoPromotion,
} from "@/lib/promotions";
import type { AlertRow } from "@/lib/types";

export type AlertDisplay = {
  name: string;
  triggers: string;
  triggerMessages: string[];
  price: number | null;
  effectivePrice: number | null;
  listPrice: number | null;
  targetPrice: number | null;
  imageUrl: string | null;
  url: string | null;
  hasPromo: boolean;
  promoDetail: string | null;
};

export function getAlertDisplay(alert: AlertRow): AlertDisplay {
  const snapshot = alert.payload?.snapshot;
  const promotionsRaw = parsePromotions(snapshot?.promotions);
  const { promotions: withoutOnline, onlineExclusiveLabel } =
    splitOnlineExclusivePromotion(promotionsRaw);
  const { promotions: promoRows, paymentPromoLabel: storedPaymentLabel } =
    splitPaymentPromoPromotion(withoutOnline);
  const paymentPromoLabel =
    snapshot?.paymentPromoLabel ?? storedPaymentLabel ?? null;

  const shelfPrice =
    typeof snapshot?.price === "number" && Number.isFinite(snapshot.price)
      ? snapshot.price
      : null;
  const listPrice =
    typeof snapshot?.listPrice === "number" && Number.isFinite(snapshot.listPrice)
      ? snapshot.listPrice
      : null;
  const targetPrice =
    typeof alert.payload?.targetPrice === "number" &&
    Number.isFinite(alert.payload.targetPrice)
      ? alert.payload.targetPrice
      : null;

  let effectivePrice = shelfPrice;
  let hasPromo = false;
  let promoDetail: string | null = null;

  if (shelfPrice != null) {
    const priced = effectiveUnitPrice(shelfPrice, promoRows);
    hasPromo = priced.hasPromo;
    effectivePrice = hasPromo ? priced.effective : shelfPrice;
    const pricing = priced.bestPromotion?.pricing;
    if (pricing && pricing.summary !== "promo") {
      promoDetail =
        pricing.unitsToBuy > 1
          ? `${pricing.summary} · llevando ${pricing.unitsToBuy}`
          : pricing.summary;
    }
  }

  if (!promoDetail && onlineExclusiveLabel) {
    promoDetail = onlineExclusiveLabel;
  } else if (!promoDetail && paymentPromoLabel) {
    promoDetail = paymentPromoLabel;
  }

  const triggerMessages =
    alert.payload?.triggers?.map((trigger) => trigger.message) ?? [
      "Oferta detectada",
    ];

  return {
    name:
      alert.payload?.trackedName ??
      snapshot?.productName ??
      alert.ean,
    triggers: triggerMessages.join(" · "),
    triggerMessages,
    price: shelfPrice,
    effectivePrice,
    listPrice,
    targetPrice,
    imageUrl: snapshot?.imageUrl ?? null,
    url: snapshot?.url ?? null,
    hasPromo,
    promoDetail,
  };
}
