import { createDbFromConfig } from "../lib/db/client";
import { resolveEnabledStores } from "../lib/stores";
import { type TrackedProduct } from "../lib/types";
import { getCheckConfig, isDryRun, isForceAlert, loadProductsFile } from "./config";
import {
  FALLBACK_JOB_SETTINGS,
  loadJobSettings,
  loadTrackedProducts,
  recordOfferDetected,
  savePriceHistory,
  updateTrackedProductImage,
  wasAlertSentToday,
} from "./db";
import { evaluateOffer } from "./offers/evaluate";
import { fetchProductStore, sleep } from "./fetch-store";

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

  const jobSettings = db
    ? await loadJobSettings(db, config.alertTo)
    : { ...FALLBACK_JOB_SETTINGS, alertEmail: config.alertTo };

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
    `Chequeo de precios · productos=${products.length} · source=${source}` +
      ` · tiendas=${jobSettings.stores.join(",")}` +
      ` · dryRun=${dryRun} · force=${forceAlert}`,
  );

  let errors = 0;
  let offersDetected = 0;
  let pricesInserted = 0;
  let pricesSkipped = 0;

  for (const product of products) {
    const stores = resolveEnabledStores(jobSettings.stores);
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
        const saved = await savePriceHistory(db, snapshot);
        if (saved === "inserted") pricesInserted += 1;
        else pricesSkipped += 1;
        await updateTrackedProductImage(db, snapshot.ean, snapshot.imageUrl);
      }

      const match = evaluateOffer(product, snapshot);
      if (!match) continue;

      if (db && !forceAlert && !dryRun) {
        const already = await wasAlertSentToday(db, match);
        if (already) {
          console.log("  (oferta ya registrada hoy con el mismo fingerprint)");
          continue;
        }
      }

      console.log(`  OFERTA: ${match.triggers.map((t) => t.message).join(" | ")}`);
      if (product.alertsEnabled === false) {
        console.log("  (alertas desactivadas para este producto)");
        continue;
      }

      if (dryRun) {
        offersDetected += 1;
        continue;
      }

      if (db) {
        await recordOfferDetected(db, match);
        offersDetected += 1;
        console.log("  (oferta registrada; email en el horario configurado)");
      }
    }
  }

  console.log(
    `\nResumen · precios nuevos=${pricesInserted} · precios sin cambios=${pricesSkipped}` +
      ` · ofertas registradas=${offersDetected}`,
  );

  if (errors > 0) process.exitCode = 1;
}
