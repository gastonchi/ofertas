import { ALL_STORES, type StoreId } from "./types";

export const STORE_LABELS: Record<StoreId, string> = {
  carrefour: "Carrefour",
  dia: "Día",
  jumbo: "Jumbo",
  disco: "Disco",
  vea: "Vea",
};

export function isStoreId(value: string): value is StoreId {
  return (ALL_STORES as readonly string[]).includes(value);
}

export function parseStores(values: FormDataEntryValue[]): StoreId[] {
  const stores = values.map(String).filter(isStoreId);
  return stores.length > 0 ? stores : [...ALL_STORES];
}

export function resolveProductStores(
  productStores: StoreId[] | undefined,
  enabledStores: StoreId[],
): StoreId[] {
  const enabled = enabledStores.length > 0 ? enabledStores : [...ALL_STORES];
  if (!productStores?.length) return enabled;
  return productStores.filter((store) => enabled.includes(store));
}
