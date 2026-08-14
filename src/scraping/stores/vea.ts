import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const VEA_BASE = "https://www.vea.com.ar";

export async function fetchVeaByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "vea",
    baseUrl: VEA_BASE,
    ean,
  });
}
