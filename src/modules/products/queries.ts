import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import {
  ALL_STORES,
  type PriceHistoryRow,
  type PriceStat,
  type ProductPriceStats,
  type StoreId,
  type StorePriceQuote,
  type TrackedProductRow,
} from "@/lib/types";
import { argentinaDay } from "@/scraping/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRICE_COLUMNS =
  "id, ean, store, product_name, price, list_price, checked_at";

export async function getProduct(id: string): Promise<TrackedProductRow | null> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("tracked_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as TrackedProductRow;
  return { ...row, alerts_enabled: row.alerts_enabled !== false };
}

function toStat(row: PriceHistoryRow | null | undefined): PriceStat {
  if (!row) return null;
  const price = Number(row.price);
  if (!Number.isFinite(price)) return null;
  return {
    price,
    store: String(row.store).trim().toLowerCase(),
    checked_at: row.checked_at,
  };
}

function pickCheapest(rows: PriceHistoryRow[]): PriceStat {
  const stats = rows
    .map((row) => toStat(row))
    .filter((stat): stat is NonNullable<PriceStat> => stat !== null);
  if (stats.length === 0) return null;

  return stats.reduce((best, stat) => {
    if (stat.price < best.price) return stat;
    if (stat.price === best.price && stat.checked_at > best.checked_at) {
      return stat;
    }
    return best;
  });
}

function buildStoreQuotes(
  latestRows: PriceHistoryRow[],
  stores: readonly StoreId[],
): StorePriceQuote[] {
  const map = new Map<string, PriceHistoryRow>();
  for (const row of latestRows) {
    map.set(String(row.store).trim().toLowerCase(), row);
  }

  return stores.map((store) => {
    const row = map.get(store);
    if (!row) return { store, price: null, checked_at: null };
    const price = Number(row.price);
    if (!Number.isFinite(price)) return { store, price: null, checked_at: null };
    return { store, price, checked_at: row.checked_at };
  });
}

function latestRowPerStore(rows: PriceHistoryRow[]): PriceHistoryRow[] {
  const latest = new Map<string, PriceHistoryRow>();
  const sorted = [...rows].sort((a, b) =>
    a.checked_at < b.checked_at ? 1 : a.checked_at > b.checked_at ? -1 : 0,
  );

  for (const row of sorted) {
    const key = String(row.store).trim().toLowerCase();
    if (!latest.has(key)) latest.set(key, row);
  }

  return [...latest.values()];
}

function inWindow(rows: PriceHistoryRow[], sinceMs: number): PriceHistoryRow[] {
  return rows.filter((row) => new Date(row.checked_at).getTime() >= sinceMs);
}

export async function productHasPriceToday(
  product: Pick<TrackedProductRow, "ean">,
): Promise<boolean> {
  await requireAuth();
  const db = createDb();
  const start = `${argentinaDay()}T00:00:00.000-03:00`;
  const { data, error } = await db
    .from("price_history")
    .select("id")
    .eq("ean", product.ean.trim())
    .gte("checked_at", start)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function fetchPriceHistory(
  ean: string,
  productName: string,
): Promise<PriceHistoryRow[]> {
  const db = createDb();
  const trimmedEan = ean.trim();
  const trimmedName = productName.trim();

  const [byEan, byName] = await Promise.all([
    db
      .from("price_history")
      .select(PRICE_COLUMNS)
      .eq("ean", trimmedEan)
      .order("checked_at", { ascending: false })
      .limit(5000),
    trimmedName
      ? db
          .from("price_history")
          .select(PRICE_COLUMNS)
          .eq("product_name", trimmedName)
          .order("checked_at", { ascending: false })
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byEan.error) throw new Error(byEan.error.message);
  if (byName.error) throw new Error(byName.error.message);

  const merged = new Map<string, PriceHistoryRow>();
  for (const row of [
    ...((byEan.data ?? []) as PriceHistoryRow[]),
    ...((byName.data ?? []) as PriceHistoryRow[]),
  ]) {
    merged.set(row.id, row);
  }
  return [...merged.values()];
}

export async function getProductPriceStats(
  product: Pick<TrackedProductRow, "ean" | "name">,
): Promise<ProductPriceStats> {
  await requireAuth();
  const rows = await fetchPriceHistory(product.ean, product.name);
  const now = Date.now();
  const latestRows = latestRowPerStore(rows);
  const latest = pickCheapest(latestRows);

  return {
    latest,
    best7d: pickCheapest(inWindow(rows, now - 7 * DAY_MS)),
    best30d: pickCheapest(inWindow(rows, now - 30 * DAY_MS)),
    latestByStore: buildStoreQuotes(latestRows, ALL_STORES).sort((a, b) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price;
    }),
  };
}
