import "dotenv/config";
import { getConfig, isDryRun, isForceAlert, loadProducts } from "./config.js";
import {
  createDb,
  recordAlertSent,
  savePriceHistory,
  wasAlertSentToday,
} from "./db/supabase.js";
import { evaluateOffer } from "./offers/evaluate.js";
import { sendAlertEmail } from "./notify/gmail.js";
import { fetchCarrefourByEan } from "./stores/carrefour.js";
import { fetchDiaByEan } from "./stores/dia.js";
import { fetchDiscoByEan } from "./stores/disco.js";
import { fetchJumboByEan } from "./stores/jumbo.js";
import { fetchVeaByEan } from "./stores/vea.js";
import type { OfferMatch, OfferSnapshot, StoreId, TrackedProduct } from "./types.js";
import { ALL_STORES } from "./types.js";

const STORE_FETCHERS: Record<StoreId, (ean: string) => Promise<OfferSnapshot | null>> = {
  carrefour: fetchCarrefourByEan,
  dia: fetchDiaByEan,
  jumbo: fetchJumboByEan,
  disco: fetchDiscoByEan,
  vea: fetchVeaByEan,
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
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

async function main() {
  const dryRun = isDryRun();
  const forceAlert = isForceAlert();
  const config = getConfig(dryRun);
  const products = loadProducts();

  console.log(
    `Ofertas MVP · productos=${products.length} · dryRun=${dryRun} · force=${forceAlert}`,
  );

  const canUseDb = Boolean(config.supabaseUrl && config.supabaseKey);
  const db = canUseDb ? createDb(config.supabaseUrl!, config.supabaseKey!) : null;
  if (!dryRun && !db) {
    throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios fuera de dry-run");
  }

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

  await sendAlertEmail({
    user: config.gmailUser!,
    appPassword: config.gmailAppPassword!,
    to: config.alertTo!,
    matches: freshMatches,
  });
  console.log(`\nEmail enviado a ${config.alertTo} (${freshMatches.length} ofertas)`);

  if (db) {
    for (const match of freshMatches) {
      await recordAlertSent(db, match);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
