import type { OfferSnapshot } from "../../lib/types";
import { fetchVtexByEan } from "./vtex";

const DIA_BASE = "https://diaonline.supermercadosdia.com.ar";

export async function fetchDiaByEan(ean: string): Promise<OfferSnapshot | null> {
  return fetchVtexByEan({
    store: "dia",
    baseUrl: DIA_BASE,
    ean,
  });
}
