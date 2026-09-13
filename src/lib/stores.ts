import { ALL_STORES, type StoreId } from "./types";

export const STORE_LABELS: Record<StoreId, string> = {
  carrefour: "Carrefour",
  coto: "Coto",
  dia: "Día",
  jumbo: "Jumbo",
  disco: "Disco",
  vea: "Vea",
};

export const STORE_LOGOS: Record<StoreId, string> = {
  carrefour: "/logos/Carrefour_id5WpI3zid_0.svg",
  coto: "/logos/coto.svg",
  dia: "/logos/dia-old-logo.svg",
  jumbo: "/logos/jumbo.png",
  disco: "/logos/Disco-Supermarket-Logo.svg",
  vea: "/logos/logo vea.webp",
};

export const STORE_COLORS: Record<StoreId, string> = {
  carrefour: "#0284c7",
  dia: "#ef4444",
  coto: "#dc2626",
  jumbo: "#ea580c",
  disco: "#7c3aed",
  vea: "#059669",
};

export function isStoreId(value: string): value is StoreId {
  return (ALL_STORES as readonly string[]).includes(value);
}

export function parseStores(values: FormDataEntryValue[]): StoreId[] {
  const stores = values.map(String).filter(isStoreId);
  return stores.length > 0 ? stores : [...ALL_STORES];
}

export function resolveEnabledStores(stores: StoreId[] | undefined): StoreId[] {
  return stores?.length ? stores : [...ALL_STORES];
}
