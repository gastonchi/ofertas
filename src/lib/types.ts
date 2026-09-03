import type { Weekday } from "./schedule";

export const ALL_STORES = [
  "carrefour",
  "coto",
  "dia",
  "jumbo",
  "disco",
  "vea",
  "masonline",
] as const;

export type StoreId = (typeof ALL_STORES)[number];

export type TrackedProduct = {
  name: string;
  ean: string;
  target_price: number;
  alertsEnabled?: boolean;
};

export type ProductNameLookupResult = {
  name: string | null;
  source: StoreId | null;
  averagePrice?: number;
  storeCount?: number;
};

export type StorePriceQuote = {
  store: StoreId;
  price: number | null;
  checked_at?: string | null;
};

export type StorePricesLookupResult = {
  name: string | null;
  stores: StorePriceQuote[];
};

export type TrackedProductRow = {
  id: string;
  name: string;
  ean: string;
  target_price: number;
  image_url?: string | null;
  stores?: StoreId[];
  active: boolean;
  alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PromotionInfo = {
  name: string;
  minimumQuantity?: number;
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
  imageUrl?: string;
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

export type AlertRow = {
  id: string;
  ean: string;
  store: string;
  fingerprint: string;
  alert_day: string;
  payload: {
    trackedName?: string;
    targetPrice?: number;
    triggers?: { type: string; message: string }[];
    snapshot?: {
      productName?: string;
      price?: number;
      url?: string;
    };
  } | null;
  sent_at: string;
};

export type PriceHistoryRow = {
  id: string;
  ean: string;
  store: string;
  product_name: string | null;
  price: number;
  list_price: number | null;
  checked_at: string;
};

export type PriceStat = {
  price: number;
  store: string;
  checked_at: string;
} | null;

export type ProductPriceStats = {
  latest: PriceStat;
  best7d: PriceStat;
  best30d: PriceStat;
  latestByStore: StorePriceQuote[];
};

export type AppSettings = {
  id: string;
  alert_email: string | null;
  default_stores: StoreId[];
  alert_days: Weekday[];
  alert_hours: string[];
  updated_at: string;
};
