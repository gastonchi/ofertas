import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const DISCO_BASE = "https://www.disco.com.ar";

export async function fetchDiscoByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "disco",
    baseUrl: DISCO_BASE,
    ean,
  });
}
