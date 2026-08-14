import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const CARREFOUR_BASE = "https://www.carrefour.com.ar";

export async function fetchCarrefourByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "carrefour",
    baseUrl: CARREFOUR_BASE,
    ean,
  });
}
