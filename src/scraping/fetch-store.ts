import type { OfferSnapshot, StoreId, TrackedProduct } from "../lib/types";
import { fetchCarrefourByEan } from "./stores/carrefour";
import { fetchCotoByEan } from "./stores/coto";
import { fetchDiaByEan } from "./stores/dia";
import { fetchDiscoByEan } from "./stores/disco";
import { fetchJumboByEan } from "./stores/jumbo";
import { fetchVeaByEan } from "./stores/vea";

export const STORE_FETCHERS: Record<
  StoreId,
  (ean: string) => Promise<OfferSnapshot | null>
> = {
  carrefour: fetchCarrefourByEan,
  coto: fetchCotoByEan,
  dia: fetchDiaByEan,
  jumbo: fetchJumboByEan,
  disco: fetchDiscoByEan,
  vea: fetchVeaByEan,
};

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchProductStore(
  product: TrackedProduct,
  store: StoreId,
): Promise<{ snapshot: OfferSnapshot | null; error?: string }> {
  const fetchStore = STORE_FETCHERS[store];
  if (!fetchStore) {
    return { snapshot: null, error: `Store no soportada: ${store}` };
  }

  try {
    const snapshot = await fetchStore(product.ean);
    return { snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { snapshot: null, error: message };
  }
}
