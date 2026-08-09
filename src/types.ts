export type StoreId = "carrefour" | "dia" | "jumbo" | "disco" | "vea";

export const ALL_STORES: StoreId[] = ["carrefour", "dia", "jumbo", "disco", "vea"];

export type TrackedProduct = {
  name: string;
  ean: string;
  target_price: number;
  stores?: StoreId[];
};

export type PromotionInfo = {
  name: string;
  minimumQuantity?: number;
  /** Precio efectivo / vigencia inferidos del nombre de la promo */
  pricing?: {
    summary: string;
    unitsToBuy: number;
    totalToPay: number;
    unitEffectivePrice: number;
    validUntilLabel?: string;
  };
};

export type OfferSnapshot = {
  store: StoreId;
  ean: string;
  productName: string;
  url?: string;
  price: number;
  listPrice: number;
  available: boolean;
  promotions: PromotionInfo[];
  checkedAt: string;
};

export type OfferTrigger =
  | { type: "below_target"; message: string }
  | { type: "list_discount"; message: string; discountPct: number }
  | { type: "promotion"; message: string; promotionName: string };

export type OfferMatch = {
  snapshot: OfferSnapshot;
  trackedName: string;
  targetPrice: number;
  triggers: OfferTrigger[];
  fingerprint: string;
};
