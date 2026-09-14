import { createDbFromConfig } from "../lib/db/client";
import { resolveEnabledStores } from "../lib/stores";
import {
  argentinaHourLabel,
  argentinaWeekday,
  isInAlertWindow,
} from "../lib/schedule";
import { type OfferMatch, type TrackedProduct } from "../lib/types";
import { getCheckConfig, isDryRun, isForceAlert, isIgnoreSchedule, loadProductsFile } from "./config";
import {
  FALLBACK_JOB_SETTINGS,
  loadJobSettings,
  loadTrackedProducts,
  recordAlertSent,
  savePriceHistory,
  updateTrackedProductImage,
  wasAlertSentToday,
} from "./db";
import { evaluateOffer } from "./offers/evaluate";
import { sendAlertEmail } from "./notify/gmail";
import { fetchProductStore, sleep } from "./fetch-store";

export async function runOfferCheck(argv = process.argv): Promise<void> {
  const dryRun = isDryRun(argv);
  const forceAlert = isForceAlert(argv);
  const forceEmail = isIgnoreSchedule(argv) || forceAlert;
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

  const shouldSendEmail =
    forceEmail ||
    isInAlertWindow(jobSettings.alertDays, jobSettings.alertHours);

  if (!shouldSendEmail) {
    const nowDay = argentinaWeekday();
    const nowHour = argentinaHourLabel();
    console.log(
      `Fuera de ventana de email (AR ${nowDay} ${nowHour}). ` +
        `Config: ${jobSettings.alertDays.join(",")} @ ${jobSettings.alertHours.join(",")}. ` +
        `Se consultan precios igual.`,
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
    `Ofertas · productos=${products.length} · source=${source}` +
      ` · tiendas=${jobSettings.stores.join(",")}` +
      ` · email=${shouldSendEmail ? "sí" : "no"}` +
      ` · ventana=${jobSettings.alertDays.join(",")} @ ${jobSettings.alertHours.join(",")}` +
      ` · dryRun=${dryRun} · force=${forceAlert}`,
  );

  const freshMatches: OfferMatch[] = [];
  let errors = 0;
  let offersOutsideWindow = 0;

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
        await savePriceHistory(db, snapshot);
        await updateTrackedProductImage(db, snapshot.ean, snapshot.imageUrl);
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
      if (product.alertsEnabled === false) {
        console.log("  (alertas desactivadas para este producto)");
        continue;
      }

      if (!shouldSendEmail) {
        offersOutsideWindow += 1;
        console.log("  (fuera de ventana de email; se reevaluará en el próximo envío)");
        continue;
      }

      freshMatches.push(match);
    }
  }

  if (offersOutsideWindow > 0) {
    console.log(
      `\n${offersOutsideWindow} oferta(s) detectada(s) fuera de la ventana de email.`,
    );
  }

  if (freshMatches.length === 0) {
    console.log("\nSin ofertas nuevas para notificar por email.");
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

  const alertTo = jobSettings.alertEmail ?? config.alertTo;

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
