import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import {
  effectiveUnitPrice,
  parsePromotions,
} from "@/lib/promotions";
import { normalizeStoreListPrice } from "@/lib/prices";
import { resolveEnabledStores } from "@/lib/stores";
import {
  type PriceHistoryRow,
  type PriceStat,
  type ProductPriceStats,
  type StoreId,
  type StorePriceQuote,
  type TrackedProductRow,
} from "@/lib/types";
import { argentinaDay, loadJobSettings, updateTrackedProductImage } from "@/scraping/db";
import { fetchProductImageByEan } from "@/scraping/lookup-name";
import { refreshProductPrices } from "@/scraping/refresh-product-prices";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRICE_COLUMNS =
  "id, ean, store, product_name, price, list_price, promotions, checked_at";

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

export async function ensureProductImage(
  product: TrackedProductRow,
  stores: StoreId[],
): Promise<TrackedProductRow> {
  if (product.image_url?.trim()) return product;

  const imageUrl = await fetchProductImageByEan(product.ean, stores);
  if (!imageUrl) return product;

  const db = createDb();
  await updateTrackedProductImage(db, product.ean, imageUrl);
  return { ...product, image_url: imageUrl };
}

export async function enrichProductsImages(
  products: TrackedProductRow[],
  stores: StoreId[],
): Promise<TrackedProductRow[]> {
  const db = createDb();
  return Promise.all(
    products.map(async (product) => {
      if (product.image_url?.trim()) return product;
      try {
        const imageUrl = await fetchProductImageByEan(product.ean, stores);
        if (!imageUrl) return product;
        await updateTrackedProductImage(db, product.ean, imageUrl);
        return { ...product, image_url: imageUrl };
      } catch {
        return product;
      }
    }),
  );
}

function normalizePriceRow(row: PriceHistoryRow): PriceHistoryRow {
  return {
    ...row,
    promotions: parsePromotions(row.promotions),
  };
}

function toStat(row: PriceHistoryRow | null | undefined): PriceStat {
  if (!row) return null;
  const shelfPrice = Number(row.price);
  if (!Number.isFinite(shelfPrice)) return null;

  const promotions = parsePromotions(row.promotions);
  const { effective, bestPromotion, hasPromo } = effectiveUnitPrice(
    shelfPrice,
    promotions,
  );
  const listPriceValue = normalizeStoreListPrice(
    String(row.store),
    shelfPrice,
    Number(row.list_price),
  );

  return {
    price: effective,
    shelfPrice,
    listPrice: listPriceValue,
    store: String(row.store).trim().toLowerCase(),
    checked_at: row.checked_at,
    hasPromo,
    bestPromotion: hasPromo ? bestPromotion : undefined,
  };
}

function pickCheapest(rows: PriceHistoryRow[]): PriceStat {
  const stats = rows
    .map((row) => toStat(normalizePriceRow(row)))
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
    map.set(String(row.store).trim().toLowerCase(), normalizePriceRow(row));
  }

  return stores.map((store) => {
    const row = map.get(store);
    if (!row) return { store, price: null };

    const shelfPrice = Number(row.price);
    if (!Number.isFinite(shelfPrice)) return { store, price: null };

    const promotions = row.promotions ?? [];
    const { effective, bestPromotion, hasPromo } = effectiveUnitPrice(
      shelfPrice,
      promotions,
    );
    const listPriceValue = normalizeStoreListPrice(
      store,
      shelfPrice,
      Number(row.list_price),
    );

    return {
      store,
      price: shelfPrice,
      listPrice: listPriceValue,
      checked_at: row.checked_at,
      promotions,
      effectivePrice: effective,
      bestPromotion: bestPromotion ?? null,
      hasPromo,
    };
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

export async function ensureProductPricesToday(
  product: Pick<
    TrackedProductRow,
    "ean" | "name" | "target_price" | "alerts_enabled"
  >,
): Promise<void> {
  const hasToday = await productHasPriceToday(product);
  if (hasToday) return;

  const db = createDb();
  const jobSettings = await loadJobSettings(db);
  const stores = resolveEnabledStores(jobSettings.stores);
  if (stores.length === 0) return;

  await refreshProductPrices(
    db,
    {
      name: product.name,
      ean: product.ean,
      target_price: Number(product.target_price),
      alertsEnabled: product.alerts_enabled !== false,
    },
    jobSettings.stores,
  );
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
  displayStores?: StoreId[],
): Promise<ProductPriceStats> {
  await requireAuth();
  const rows = await fetchPriceHistory(product.ean, product.name);
  const now = Date.now();
  const latestRows = latestRowPerStore(rows);
  const latest = pickCheapest(latestRows);
  const stores = resolveEnabledStores(displayStores);

  return {
    latest,
    best7d: pickCheapest(inWindow(rows, now - 7 * DAY_MS)),
    best15d: pickCheapest(inWindow(rows, now - 15 * DAY_MS)),
    best30d: pickCheapest(inWindow(rows, now - 30 * DAY_MS)),
    latestByStore: buildStoreQuotes(latestRows, stores).sort((a, b) => {
      if (a.effectivePrice == null && b.effectivePrice == null) return 0;
      if (a.effectivePrice == null) return 1;
      if (b.effectivePrice == null) return -1;
      return a.effectivePrice - b.effectivePrice;
    }),
  };
}
