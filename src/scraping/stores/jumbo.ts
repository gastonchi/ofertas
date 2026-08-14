import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const JUMBO_BASE = "https://www.jumbo.com.ar";

export async function fetchJumboByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "jumbo",
    baseUrl: JUMBO_BASE,
    ean,
  });
}
