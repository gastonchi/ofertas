import type { OfferSnapshot, ProductNameLookupResult } from "../lib/types";
import { fetchCarrefourByEan } from "./stores/carrefour";
import { fetchDiaByEan } from "./stores/dia";

const LOOKUP_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function nameFromStore(
  fetcher: (ean: string) => Promise<OfferSnapshot | null>,
  ean: string,
): Promise<string | null> {
  try {
    const snapshot = await withTimeout(fetcher(ean), LOOKUP_TIMEOUT_MS);
    const name = snapshot?.productName?.trim();
    if (!name || name === "Producto sin nombre") return null;
    return name;
  } catch {
    return null;
  }
}

export async function lookupProductNameByEan(
  ean: string,
): Promise<ProductNameLookupResult | null> {
  const carrefour = await nameFromStore(fetchCarrefourByEan, ean);
  if (carrefour) return { name: carrefour, source: "carrefour" };

  const dia = await nameFromStore(fetchDiaByEan, ean);
  if (dia) return { name: dia, source: "dia" };

  return null;
}
