import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProductStores } from "../lib/stores";
import type { StoreId, TrackedProduct } from "../lib/types";
import { savePriceHistory } from "./db";
import { fetchProductStore, sleep } from "./fetch-store";

export type RefreshProductPricesResult = {
  saved: number;
  notFound: StoreId[];
  errors: { store: StoreId; message: string }[];
};

export async function refreshProductPrices(
  db: SupabaseClient,
  product: TrackedProduct,
  enabledStores: StoreId[],
): Promise<RefreshProductPricesResult> {
  const stores = resolveProductStores(product.stores, enabledStores);
  const result: RefreshProductPricesResult = {
    saved: 0,
    notFound: [],
    errors: [],
  };

  for (const store of stores) {
    const { snapshot, error } = await fetchProductStore(product, store);
    await sleep(400);

    if (error) {
      result.errors.push({ store, message: error });
      continue;
    }

    if (!snapshot) {
      result.notFound.push(store);
      continue;
    }

    await savePriceHistory(db, snapshot);
    result.saved += 1;
  }

  return result;
}
