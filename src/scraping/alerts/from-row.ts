import { isStoreId } from "../../lib/stores";
import type { AlertRow, OfferMatch, OfferSnapshot, OfferTrigger } from "../../lib/types";

export function offerMatchFromAlertRow(alert: AlertRow): OfferMatch | null {
  const snapshot = alert.payload?.snapshot;
  const storeKey = alert.store.trim().toLowerCase();
  if (
    !snapshot ||
    !isStoreId(storeKey) ||
    typeof snapshot.price !== "number" ||
    !Number.isFinite(snapshot.price)
  ) {
    return null;
  }

  const offerSnapshot: OfferSnapshot = {
    store: storeKey,
    ean: alert.ean,
    productName: snapshot.productName ?? alert.ean,
    url: snapshot.url,
    imageUrl: snapshot.imageUrl,
    price: snapshot.price,
    listPrice: snapshot.listPrice ?? snapshot.price,
    available: true,
    promotions: snapshot.promotions ?? [],
    checkedAt: alert.sent_at,
    onlineExclusiveLabel: snapshot.onlineExclusiveLabel,
  };

  const triggers = (alert.payload?.triggers ?? []).map((trigger) => ({
    type: trigger.type as OfferTrigger["type"],
    message: trigger.message,
  })) as OfferTrigger[];

  return {
    snapshot: offerSnapshot,
    trackedName: alert.payload?.trackedName ?? offerSnapshot.productName,
    targetPrice: alert.payload?.targetPrice ?? 0,
    triggers,
    fingerprint: alert.fingerprint,
  };
}
