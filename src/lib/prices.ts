import { CENCOSUD_CLUSTER_STORES } from "@/scraping/promotions/vtex-bases";
import type { StoreId } from "./types";

/**
 * Jumbo/Disco/Vea devuelven ListPrice en centavos (ej. 628099 → $6280,99).
 * Solo devolvemos lista cuando es mayor al precio de góndola (tachado real).
 */
export function normalizeStoreListPrice(
  store: string,
  shelfPrice: number,
  rawListPrice: number | null | undefined,
): number | null {
  if (
    rawListPrice == null ||
    !Number.isFinite(rawListPrice) ||
    shelfPrice <= 0
  ) {
    return null;
  }

  let listPrice = rawListPrice;
  const storeId = store.trim().toLowerCase() as StoreId;

  if (CENCOSUD_CLUSTER_STORES.has(storeId) && listPrice > shelfPrice * 5) {
    listPrice = listPrice / 100;
  }

  if (listPrice <= shelfPrice) {
    return null;
  }

  return listPrice;
}

export function normalizeVtexListPrice(
  store: StoreId,
  shelfPrice: number,
  rawListPrice: number,
): number {
  return (
    normalizeStoreListPrice(store, shelfPrice, rawListPrice) ?? shelfPrice
  );
}
