import type { OfferSnapshot } from "../types.js";
import { fetchVtexByEan } from "./vtex.js";

const JUMBO_BASE = "https://www.jumbo.com.ar";

export async function fetchJumboByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "jumbo",
    baseUrl: JUMBO_BASE,
    ean,
  });
}
