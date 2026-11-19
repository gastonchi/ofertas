/**
 * Casos de regresión para computePromoPricing / isPaymentOnlyPromo.
 * Ejecutar: npx tsx src/scraping/offers/pricing.test-cases.ts
 */
import assert from "node:assert/strict";
import { computePromoPricing } from "./pricing";
import { isPaymentOnlyPromo } from "../promotions/text-patterns";

const cardPromo =
  "35% Off Tarjeta Carrefour o Cuenta digital Max 8  18 al 24/11";
assert.equal(isPaymentOnlyPromo(cardPromo), true);

const fritolimShelf = 3674.25;
const fritolimList = 4899;

// Teaser de tarjeta: precio efectivo = góndola, sin volver a aplicar el %.
const cardPricing = computePromoPricing(
  cardPromo,
  fritolimShelf,
  1,
  fritolimList,
);
assert.notEqual(cardPricing?.unitEffectivePrice, 2388);
assert.equal(cardPricing?.unitEffectivePrice, Math.round(fritolimShelf));

const productPromo = computePromoPricing(
  "35% de Descuento en Aceite",
  fritolimShelf,
  1,
  fritolimList,
);
assert.equal(productPromo?.unitEffectivePrice, 3184);

const fullShelf = computePromoPricing("25% dto", 4000, 1, 4000);
assert.equal(fullShelf?.unitEffectivePrice, 3000);

console.log("pricing.test-cases: ok");