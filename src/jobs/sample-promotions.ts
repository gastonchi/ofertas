import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_STORES, type StoreId } from "../lib/types";
import { fetchCotoRawByEan, type CotoRawOffer } from "../scraping/promotions/coto-raw";
import { PROMO_SAMPLE_EANS } from "../scraping/promotions/sample-eans";
import { isVtexStore, VTEX_STORE_BASES } from "../scraping/promotions/vtex-bases";
import { fetchVtexRawByEan, type VtexRawOffer } from "../scraping/promotions/vtex-raw";
import { classifyPromoText } from "../scraping/promotions/text-patterns";
import { sleep } from "../scraping/fetch-store";

type StorePromoResult = VtexRawOffer | CotoRawOffer;

function isCotoRaw(row: StorePromoResult): row is CotoRawOffer {
  return row.store === "coto";
}

function isVtexRaw(row: StorePromoResult): row is VtexRawOffer {
  return row.store !== "coto";
}

type SampleRow = {
  ean: string;
  notes: string;
  stores: Partial<Record<StoreId, StorePromoResult>>;
};

type PromoResearchReport = {
  generatedAt: string;
  storeCount: number;
  sampleCount: number;
  samples: SampleRow[];
  teaserTextCatalog: string[];
  clusterTextCatalog: string[];
  cotoDiscountTextCatalog: string[];
  patternSummary: Record<string, number>;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function collectTeaserTexts(samples: SampleRow[]): string[] {
  const texts: string[] = [];
  for (const sample of samples) {
    for (const row of Object.values(sample.stores)) {
      if (!row || !isVtexRaw(row)) continue;
      for (const t of row.teasers) {
        if (t.name) texts.push(t.name);
      }
    }
  }
  return uniqueSorted(texts);
}

function collectClusterTexts(samples: SampleRow[]): string[] {
  const texts: string[] = [];
  for (const sample of samples) {
    for (const row of Object.values(sample.stores)) {
      if (!row || !isVtexRaw(row)) continue;
      for (const label of row.clusterPromoLabels ?? []) {
        texts.push(label);
      }
    }
  }
  return uniqueSorted(texts);
}

function buildPatternSummary(samples: SampleRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (kind: string) => {
    counts[kind] = (counts[kind] ?? 0) + 1;
  };

  for (const sample of samples) {
    for (const row of Object.values(sample.stores)) {
      if (!row) continue;
      if (isCotoRaw(row)) {
        for (const d of row.discounts) {
          const text = [d.takingText, d.discountText].filter(Boolean).join(" ");
          bump(classifyPromoText(text).kind);
        }
        continue;
      }
      if (!isVtexRaw(row)) continue;
      for (const t of row.teasers) {
        if (t.name) bump(classifyPromoText(t.name).kind);
      }
      for (const label of row.clusterPromoLabels ?? []) {
        bump(classifyPromoText(label).kind);
      }
    }
  }
  return counts;
}

function formatPricingLabel(
  name: string,
  pricing: { summary: string; unitEffectivePrice: number; unitsToBuy: number; kind?: string } | undefined,
): string {
  if (!pricing) {
    const c = classifyPromoText(name);
    return `sin parser (${c.kind}${c.skipReason ? `: ${c.skipReason}` : ""})`;
  }
  return `${pricing.summary} [${pricing.kind ?? "?"}] → $${pricing.unitEffectivePrice}/u (${pricing.unitsToBuy} u)`;
}

function collectCotoDiscountTexts(samples: SampleRow[]): string[] {
  const texts: string[] = [];
  for (const sample of samples) {
    const coto = sample.stores.coto;
    if (!coto || !isCotoRaw(coto)) continue;
    for (const d of coto.discounts) {
      const parts = [d.takingText, d.discountText, d.comments].filter(Boolean);
      texts.push(parts.join(" | "));
    }
  }
  return uniqueSorted(texts);
}

function printConsoleSummary(report: PromoResearchReport) {
  console.log(`\n=== Muestra de promociones (${report.sampleCount} EANs × ${report.storeCount} tiendas) ===\n`);

  for (const sample of report.samples) {
    console.log(`EAN ${sample.ean} — ${sample.notes}`);
    for (const store of ALL_STORES) {
      const row = sample.stores[store];
      if (!row) continue;

      if (isCotoRaw(row)) {
        const coto = row;
        if (!coto.found) {
          console.log(`  [coto] no encontrado`);
          continue;
        }
        const promoCount = coto.discounts.length;
        console.log(
          `  [coto] $${coto.price ?? "?"} | ${promoCount} discount(s) | snapshot.promos=${coto.currentSnapshot?.promotions.length ?? 0}`,
        );
        for (const d of coto.discounts) {
          console.log(
            `         · ${[d.takingText, d.discountText].filter(Boolean).join(" ")} → ${d.discountPrice ?? "?"} (${d.regularPriceText ?? ""})`,
          );
        }
        continue;
      }

      const vtex = row;
      if (!isVtexRaw(vtex)) continue;
      if (!vtex.found) {
        console.log(`  [${store}] no encontrado`);
        continue;
      }

      const teaserNames = vtex.teasers.map((t) => t.name).filter(Boolean);
      const clusterLabels = vtex.clusterPromoLabels ?? [];
      const parsed = vtex.extractedPromotions;
      console.log(
        `  [${store}] $${vtex.price ?? "?"} | teasers=${teaserNames.length} clusters=${clusterLabels.length} parsed=${parsed.length}`,
      );
      for (const name of teaserNames) {
        const match = parsed.find((p) => p.name === name);
        console.log(`         [teaser] ${name}`);
        console.log(`           → ${formatPricingLabel(name, match?.pricing)}`);
      }
      for (const label of clusterLabels) {
        const match = parsed.find((p) => p.name === label);
        const classified = classifyPromoText(label);
        console.log(`         [cluster] ${label} (${classified.kind})`);
        console.log(`           → ${formatPricingLabel(label, match?.pricing)}`);
      }
      if (teaserNames.length === 0 && clusterLabels.length === 0) {
        const allClusters = Object.values(vtex.productClusters ?? {});
        if (allClusters.length > 0) {
          console.log(`         (sin promo accionable; ${allClusters.length} clusters totales)`);
        }
      }
    }
    console.log("");
  }

  console.log("--- Catálogo de textos VTEX (teasers) ---");
  for (const t of report.teaserTextCatalog) {
    console.log(`  · ${t}`);
  }

  console.log("\n--- Catálogo de textos Coto (discounts) ---");
  for (const t of report.cotoDiscountTextCatalog) {
    console.log(`  · ${t}`);
  }

  console.log("\n--- Catálogo productClusters Cencosud (Jumbo/Disco/Vea) ---");
  for (const t of report.clusterTextCatalog) {
    const c = classifyPromoText(t);
    console.log(`  · [${c.kind}] ${t}`);
  }

  console.log("\n--- Resumen de patrones detectados ---");
  for (const [kind, count] of Object.entries(report.patternSummary).sort()) {
    console.log(`  ${kind}: ${count}`);
  }
  console.log("");
}

async function fetchStorePromo(
  store: StoreId,
  ean: string,
): Promise<StorePromoResult> {
  if (store === "coto") {
    return fetchCotoRawByEan(ean);
  }

  const base = VTEX_STORE_BASES[store];
  if (!base) {
    throw new Error(`Tienda sin base VTEX: ${store}`);
  }
  return fetchVtexRawByEan(store, base, ean);
}

async function main() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outPath = outArg
    ? resolve(process.cwd(), outArg.slice("--out=".length))
    : resolve(process.cwd(), "promo-research", "samples.json");

  const samples: SampleRow[] = [];

  for (const { ean, notes } of PROMO_SAMPLE_EANS) {
    const stores: Partial<Record<StoreId, StorePromoResult>> = {};

    for (const store of ALL_STORES) {
      if (!isVtexStore(store) && store !== "coto") continue;

      try {
        stores[store] = await fetchStorePromo(store, ean);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`⚠ ${store} ${ean}: ${message}`);
      }

      await sleep(120);
    }

    samples.push({ ean, notes, stores });
  }

  const report: PromoResearchReport = {
    generatedAt: new Date().toISOString(),
    storeCount: ALL_STORES.length,
    sampleCount: samples.length,
    samples,
    teaserTextCatalog: collectTeaserTexts(samples),
    clusterTextCatalog: collectClusterTexts(samples),
    cotoDiscountTextCatalog: collectCotoDiscountTexts(samples),
    patternSummary: buildPatternSummary(samples),
  };

  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Guardado: ${outPath}`);
  printConsoleSummary(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
