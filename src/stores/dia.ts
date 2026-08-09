import type { OfferSnapshot } from "../types.js";
import { fetchVtexByEan } from "./vtex.js";

const DIA_BASE = "https://diaonline.supermercadosdia.com.ar";

export async function fetchDiaByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "dia",
    baseUrl: DIA_BASE,
    ean,
  });
}
