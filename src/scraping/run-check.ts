import { createDbFromConfig } from "../lib/db/client";
import { ALL_STORES, type OfferMatch, type OfferSnapshot, type StoreId, type TrackedProduct } from "../lib/types";
import { getCheckConfig, isDryRun, isForceAlert, loadProductsFile } from "./config";
import {
  loadAlertEmail,
  loadTrackedProducts,
  recordAlertSent,
  savePriceHistory,
  wasAlertSentToday,
} from "./db";
import { evaluateOffer } from "./offers/evaluate";
import { sendAlertEmail } from "./notify/gmail";
import { fetchCarrefourByEan } from "./stores/carrefour";
import { fetchDiaByEan } from "./stores/dia";
import { fetchDiscoByEan } from "./stores/disco";
import { fetchJumboByEan } from "./stores/jumbo";
import { fetchVeaByEan } from "./stores/vea";

const STORE_FETCHERS: Record<StoreId, (ean: string) => Promise<OfferSnapshot | null>> = {
  carrefour: fetchCarrefourByEan,
  dia: fetchDiaByEan,
  jumbo: fetchJumboByEan,
  disco: fetchDiscoByEan,
  vea: fetchVeaByEan,
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProductStore(
  product: TrackedProduct,
  store: StoreId,
): Promise<{ snapshot: OfferSnapshot | null; error?: string }> {
  const fetchStore = STORE_FETCHERS[store];
  if (!fetchStore) {
    return { snapshot: null, error: `Store no soportada: ${store}` };
  }

  try {
    const snapshot = await fetchStore(product.ean);
    return { snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { snapshot: null, error: message };
  }
}

export async function runOfferCheck(argv = process.argv): Promise<void> {
  const dryRun = isDryRun(argv);
  const forceAlert = isForceAlert(argv);
  const config = getCheckConfig(dryRun);

  const canUseDb = Boolean(config.supabaseUrl && config.supabaseKey);
  const db = canUseDb
    ? createDbFromConfig(config.supabaseUrl!, config.supabaseKey!)
    : null;
  if (!dryRun && !db) {
    throw new Error(
      "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios fuera de dry-run",
    );
  }

  let products: TrackedProduct[];
  let source: "supabase" | "products.json";

  if (db) {
    const fromDb = await loadTrackedProducts(db);
    if (fromDb.length > 0) {
      products = fromDb;
      source = "supabase";
    } else {
      products = loadProductsFile();
      source = "products.json";
    }
  } else {
    products = loadProductsFile();
    source = "products.json";
  }

  console.log(
    `Ofertas · productos=${products.length} · source=${source} · dryRun=${dryRun} · force=${forceAlert}`,
  );

  const freshMatches: OfferMatch[] = [];
  let errors = 0;

  for (const product of products) {
    const stores = product.stores?.length ? product.stores : ALL_STORES;
    console.log(`\n→ ${product.name} (${product.ean}) objetivo $${product.target_price}`);

    for (const store of stores) {
      const { snapshot, error } = await fetchProductStore(product, store);
      await sleep(400);

      if (error) {
        console.error(`  ERROR: ${error}`);
        errors += 1;
        continue;
      }

      if (!snapshot) {
        console.warn(`  [${store}] EAN ${product.ean} no encontrado`);
        continue;
      }

      console.log(
        `  [${store}] ${snapshot.productName} → $${snapshot.price}` +
          (snapshot.promotions.length
            ? ` | promos: ${snapshot.promotions.map((p) => p.name).join("; ")}`
            : ""),
      );

      if (db) {
        await savePriceHistory(db, snapshot);
      }

      const match = evaluateOffer(product, snapshot);
      if (!match) continue;

      if (db && !forceAlert && !dryRun) {
        const already = await wasAlertSentToday(db, match);
        if (already) {
          console.log("  (ya alertado hoy con el mismo fingerprint)");
          continue;
        }
      }

      console.log(`  OFERTA: ${match.triggers.map((t) => t.message).join(" | ")}`);
      freshMatches.push(match);
    }
  }

  if (freshMatches.length === 0) {
    console.log("\nSin ofertas nuevas para notificar.");
    if (errors > 0) process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(`\nDRY RUN: se omitiría email con ${freshMatches.length} oferta(s).`);
    for (const m of freshMatches) {
      console.log(`- ${m.trackedName}: ${m.triggers.map((t) => t.message).join(" | ")}`);
    }
    return;
  }

  const alertTo = db
    ? (await loadAlertEmail(db, config.alertTo)) ?? config.alertTo
    : config.alertTo;

  await sendAlertEmail({
    user: config.gmailUser!,
    appPassword: config.gmailAppPassword!,
    to: alertTo!,
    matches: freshMatches,
  });
  console.log(`\nEmail enviado a ${alertTo} (${freshMatches.length} ofertas)`);

  if (db) {
    for (const match of freshMatches) {
      await recordAlertSent(db, match);
    }
  }
}
