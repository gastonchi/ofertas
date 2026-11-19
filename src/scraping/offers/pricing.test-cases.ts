/**
 * Casos de regresión para computePromoPricing / isPaymentOnlyPromo.
 * Ejecutar: npx tsx src/scraping/offers/pricing.test-cases.ts
 */
import assert from "node:assert/strict";
import { promotionsForPriceContext } from "../../lib/promotions";
import { computePromoPricing } from "./pricing";
import { isPaymentOnlyPromo } from "../promotions/text-patterns";
import { effectiveUnitPrice } from "../../lib/promotions";

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

const staleDbPromo = [
  {
    name: "35% Off Tarjeta Carrefour o Cuenta digital Max 24  18 al 24/11",
    pricing: {
      summary: "35% dto",
      unitsToBuy: 1,
      totalToPay: 2925,
      unitEffectivePrice: 2925,
    },
  },
];
const delValleShelf = 4500;
const delValleList = 6000;
const hydrated = promotionsForPriceContext(
  staleDbPromo,
  delValleShelf,
  delValleList,
);
assert.equal(hydrated.length, 0);
assert.equal(
  effectiveUnitPrice(delValleShelf, hydrated).effective,
  delValleShelf,
);

console.log("pricing.test-cases: ok");