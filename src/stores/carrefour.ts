import type { OfferSnapshot } from "../types.js";
import { fetchVtexByEan } from "./vtex.js";

const CARREFOUR_BASE = "https://www.carrefour.com.ar";

export async function fetchCarrefourByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "carrefour",
    baseUrl: CARREFOUR_BASE,
    ean,
  });
}
