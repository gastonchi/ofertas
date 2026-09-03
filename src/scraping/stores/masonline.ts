import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const MASONLINE_BASE = "https://www.masonline.com.ar";

export async function fetchMasonlineByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "masonline",
    baseUrl: MASONLINE_BASE,
    ean,
  });
}
