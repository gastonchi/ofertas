export const ALL_STORES = ["carrefour", "dia", "jumbo", "disco", "vea"] as const;

export type StoreId = (typeof ALL_STORES)[number];

export type TrackedProductRow = {
  id: string;
  name: string;
  ean: string;
  target_price: number;
  stores: StoreId[];
  active: boolean;
  created_at: string;
  updated_at: string;
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
