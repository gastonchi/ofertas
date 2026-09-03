import type { StoreId } from "../../lib/types";

/** Bases VTEX usadas por cada tienda integrada (Coto usa Constructor.io). */
export const VTEX_STORE_BASES: Partial<Record<StoreId, string>> = {
  carrefour: "https://www.carrefour.com.ar",
  dia: "https://diaonline.supermercadosdia.com.ar",
  jumbo: "https://www.jumbo.com.ar",
  disco: "https://www.disco.com.ar",
  vea: "https://www.vea.com.ar",
};

/** Jumbo/Disco/Vea exponen promos en productClusters, no en teasers. */
export const CENCOSUD_CLUSTER_STORES = new Set<StoreId>([
  "jumbo",
  "disco",
  "vea",
]);

export function isVtexStore(store: StoreId): boolean {
  return store in VTEX_STORE_BASES;
}
