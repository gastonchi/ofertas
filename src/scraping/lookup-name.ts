import {
  ALL_STORES,
  type OfferSnapshot,
  type ProductNameLookupResult,
  type StoreId,
  type StorePricesLookupResult,
} from "../lib/types";
import { STORE_FETCHERS } from "./fetch-store";

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

async function snapshotFromStore(
  store: StoreId,
  ean: string,
): Promise<OfferSnapshot | null> {
  try {
    return await withTimeout(STORE_FETCHERS[store](ean), LOOKUP_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export async function fetchEanSnapshots(
  ean: string,
): Promise<{ store: StoreId; snapshot: OfferSnapshot | null }[]> {
  return Promise.all(
    ALL_STORES.map(async (store) => ({
      store,
      snapshot: await snapshotFromStore(store, ean),
    })),
  );
}

function usableName(snapshot: OfferSnapshot | null): string | null {
  const name = snapshot?.productName?.trim();
  if (!name || name === "Producto sin nombre") return null;
  return name;
}

function usablePrice(snapshot: OfferSnapshot | null): number | null {
  const price = Number(snapshot?.price);
  if (Number.isFinite(price) && price > 0) return price;
  return null;
}

export async function lookupProductNameByEan(
  ean: string,
): Promise<ProductNameLookupResult | null> {
  const snapshots = await fetchEanSnapshots(ean);

  const prices = snapshots
    .map((item) => usablePrice(item.snapshot))
    .filter((price): price is number => price != null);

  const named = snapshots.find((item) => usableName(item.snapshot));
  const name = named ? usableName(named.snapshot) : null;

  if (!name && prices.length === 0) return null;

  const averagePrice =
    prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : undefined;

  return {
    name,
    source: named?.store ?? null,
    averagePrice,
    storeCount: prices.length,
  };
}

export async function lookupStorePricesByEan(
  ean: string,
): Promise<StorePricesLookupResult> {
  const snapshots = await fetchEanSnapshots(ean);
  const named = snapshots.find((item) => usableName(item.snapshot));
  const priceByStore = new Map<StoreId, number | null>(
    snapshots.map((item) => [item.store, usablePrice(item.snapshot)]),
  );

  return {
    name: named ? usableName(named.snapshot) : null,
    stores: ALL_STORES.map((store) => ({
      store,
      price: priceByStore.get(store) ?? null,
    })),
  };
}
