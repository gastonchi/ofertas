import type { OfferSnapshot } from "../../lib/types";

const COTO_BASE = "https://www.coto.com.ar";
/** Sucursal de referencia del catálogo digital (precio online). */
const COTO_CATALOG_STORE = "200";
/** Clave pública del front de Coto Digital (Constructor.io). */
const CONSTRUCTOR_KEY = "key_r6xzz4IAoTWcipni";
const CONSTRUCTOR_CLIENT = "cio-fe-web-coto-4.2.0";

type CotoStorePrice = {
  store?: string;
  listPrice?: number;
  formatPrice?: number;
};

type CotoProductData = {
  url?: string;
  product_main_ean?: number | string;
  sku_display_name?: string;
  sku_description?: string;
  product_list_price?: number;
  store_availability?: string[];
  price?: CotoStorePrice[];
};

type CotoSearchResult = {
  value?: string;
  data?: CotoProductData;
};

type CotoSearchResponse = {
  response?: {
    results?: CotoSearchResult[];
  };
};

function normalizeEan(value: number | string | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function pickStorePrice(
  prices: CotoStorePrice[] | undefined,
  storeId: string,
): CotoStorePrice | null {
  if (!prices?.length) return null;
  return prices.find((entry) => entry.store === storeId) ?? null;
}

function productUrl(data: CotoProductData): string | undefined {
  if (!data.url) return undefined;
  const path = data.url.startsWith("/") ? data.url : `/${data.url}`;
  return `${COTO_BASE}/sitios/cdigi/productos${path}`;
}

export async function fetchCotoByEan(ean: string): Promise<OfferSnapshot | null> {
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

  if (!match?.data) return null;

  const data = match.data;
  const storePrice = pickStorePrice(data.price, COTO_CATALOG_STORE);
  const shelfPrice = Number(
    storePrice?.listPrice ?? data.product_list_price ?? 0,
  );
  const listPrice = Number(
    storePrice?.listPrice ?? data.product_list_price ?? shelfPrice,
  );

  return {
    store: "coto",
    ean,
    productName:
      match.value?.trim() ||
      data.sku_display_name?.trim() ||
      data.sku_description?.trim() ||
      "Producto sin nombre",
    url: productUrl(data),
    price: shelfPrice,
    listPrice,
    available: (data.store_availability ?? []).includes(COTO_CATALOG_STORE),
    promotions: [],
    checkedAt: new Date().toISOString(),
  };
}
