import type { OfferSnapshot } from "../../lib/types";
import { fetchCotoByEan } from "../stores/coto";

const COTO_BASE = "https://www.coto.com.ar";
const CONSTRUCTOR_KEY = "key_r6xzz4IAoTWcipni";
const CONSTRUCTOR_CLIENT = "cio-fe-web-coto-4.2.0";

type CotoDiscount = {
  id?: string;
  comments?: string;
  takingText?: string | null;
  discountText?: string;
  regularPrice?: string | null;
  discountImage?: string | null;
  discountPrice?: string;
  regularPriceText?: string;
};

type CotoPaymentDiscount = {
  id?: string;
  comentarios?: string;
  precioCuota?: string;
  cantidadCuotas?: string;
  imagenDescuento?: string;
};

type CotoProductData = {
  url?: string;
  image_url?: string;
  product_main_ean?: number | string;
  sku_display_name?: string;
  product_list_price?: number;
  discounts?: CotoDiscount[];
  discounts_payment_methods?: CotoPaymentDiscount[];
  price?: Array<{ store?: string; listPrice?: number }>;
  store_availability?: string[];
};

type CotoSearchResponse = {
  response?: {
    results?: Array<{ value?: string; data?: CotoProductData }>;
  };
};

export type CotoRawOffer = {
  store: "coto";
  ean: string;
  found: boolean;
  productName?: string;
  url?: string;
  price?: number;
  listPrice?: number;
  available?: boolean;
  discounts: CotoDiscount[];
  discountsPaymentMethods: CotoPaymentDiscount[];
  /** Snapshot actual del scraper (promos aún vacías) */
  currentSnapshot?: OfferSnapshot | null;
};

function normalizeEan(value: number | string | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export async function fetchCotoRawByEan(ean: string): Promise<CotoRawOffer> {
  const url =
    `https://ac.cnstrc.com/search/${encodeURIComponent(ean)}` +
    `?key=${CONSTRUCTOR_KEY}` +
    `&c=${encodeURIComponent(CONSTRUCTOR_CLIENT)}` +
    `&num_results_per_page=5`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ofertas-mvp/0.1 (personal price watcher)",
    },
  });

  if (!res.ok) {
    throw new Error(`coto HTTP ${res.status} para EAN ${ean}`);
  }

  const body = (await res.json()) as CotoSearchResponse;
  const results = body.response?.results ?? [];
  const match = results.find(
    (result) => normalizeEan(result.data?.product_main_ean) === ean,
  );

  if (!match?.data) {
    return {
      store: "coto",
      ean,
      found: false,
      discounts: [],
      discountsPaymentMethods: [],
    };
  }

  const data = match.data;
  const storePrice = data.price?.find((p) => p.store === "200");
  const shelfPrice = Number(
    storePrice?.listPrice ?? data.product_list_price ?? 0,
  );

  const currentSnapshot = await fetchCotoByEan(ean);

  return {
    store: "coto",
    ean,
    found: true,
    productName:
      match.value?.trim() ||
      data.sku_display_name?.trim() ||
      currentSnapshot?.productName,
    url: data.url
      ? `${COTO_BASE}/sitios/cdigi/productos${data.url.startsWith("/") ? data.url : `/${data.url}`}`
      : currentSnapshot?.url,
    price: shelfPrice,
    listPrice: shelfPrice,
    available: (data.store_availability ?? []).includes("200"),
    discounts: data.discounts ?? [],
    discountsPaymentMethods: data.discounts_payment_methods ?? [],
    currentSnapshot,
  };
}
