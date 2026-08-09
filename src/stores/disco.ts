import type { OfferSnapshot } from "../types.js";
import { fetchVtexByEan } from "./vtex.js";

const DISCO_BASE = "https://www.disco.com.ar";

export async function fetchDiscoByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "disco",
    baseUrl: DISCO_BASE,
    ean,
  });
}
