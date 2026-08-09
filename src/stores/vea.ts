import type { OfferSnapshot } from "../types.js";
import { fetchVtexByEan } from "./vtex.js";

const VEA_BASE = "https://www.vea.com.ar";

export async function fetchVeaByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "vea",
    baseUrl: VEA_BASE,
    ean,
  });
}
