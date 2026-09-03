import type { StoreId } from "../../lib/types";
import { extractPromotions } from "../stores/vtex";
import {
  classifyPromoText,
  filterProductClusterLabels,
  type ClassifiedPromoText,
} from "./text-patterns";
import { CENCOSUD_CLUSTER_STORES } from "./vtex-bases";

const USER_AGENT = "ofertas-mvp/0.1 (personal price watcher)";

type VtexTeaser = {
  Name?: string;
  Conditions?: { MinimumQuantity?: number; Parameters?: unknown[] };
  Effects?: { Parameters?: unknown[] };
  GeneralValues?: Record<string, unknown>;
  "<Name>k__BackingField"?: string;
  "<Conditions>k__BackingField"?: {
    "<MinimumQuantity>k__BackingField"?: number;
    Parameters?: unknown[];
  };
};

type VtexCommertialOffer = {
  Price?: number;
  ListPrice?: number;
  PriceWithoutDiscount?: number;
  PriceValidUntil?: string;
  AvailableQuantity?: number;
  DiscountHighLight?: unknown;
  DiscountHighlights?: unknown;
  Teasers?: VtexTeaser[];
  PromotionTeasers?: VtexTeaser[];
};

type VtexProduct = {
  productName?: string;
  link?: string;
  linkText?: string;
  productClusters?: Record<string, string>;
  clusterHighlights?: Record<string, string>;
  items?: Array<{
    ean?: string;
    clusterHighlights?: unknown;
    sellers?: Array<{
      sellerDefault?: boolean;
      sellerName?: string;
      commertialOffer?: VtexCommertialOffer;
    }>;
  }>;
};

export type VtexRawTeaser = {
  name: string;
  minimumQuantity?: number;
  conditions?: unknown;
  effects?: unknown;
  generalValues?: Record<string, unknown>;
  source: "Teasers" | "PromotionTeasers";
};

export type VtexRawOffer = {
  store: StoreId;
  ean: string;
  found: boolean;
  productName?: string;
  url?: string;
  price?: number;
  listPrice?: number;
  priceWithoutDiscount?: number;
  priceValidUntil?: string;
  availableQuantity?: number;
  discountHighlight?: unknown;
  teasers: VtexRawTeaser[];
  /** Todos los productClusters del producto (Jumbo/Disco/Vea) */
  productClusters?: Record<string, string>;
  /** Labels de cluster que parecen promos accionables */
  clusterPromoLabels?: string[];
  /** Clasificación de cada label accionable */
  classifiedClusters?: ClassifiedPromoText[];
  /** Promos ya filtradas por `extractPromotions` + pricing calculado */
  extractedPromotions: ReturnType<typeof extractPromotions>;
  /** Fragmento útil del commertialOffer para depuración */
  commertialOfferKeys?: string[];
};

function teaserName(t: VtexTeaser): string {
  return (t.Name ?? t["<Name>k__BackingField"] ?? "").trim();
}

function teaserMinQty(t: VtexTeaser): number | undefined {
  return (
    t.Conditions?.MinimumQuantity ??
    t["<Conditions>k__BackingField"]?.["<MinimumQuantity>k__BackingField"]
  );
}

function mapTeasers(
  list: VtexTeaser[] | undefined,
  source: VtexRawTeaser["source"],
): VtexRawTeaser[] {
  if (!list?.length) return [];
  return list.map((t) => ({
    name: teaserName(t),
    minimumQuantity: teaserMinQty(t),
    conditions: t.Conditions ?? t["<Conditions>k__BackingField"],
    effects: t.Effects,
    generalValues: t.GeneralValues,
    source,
  }));
}

export async function fetchVtexRawByEan(
  store: StoreId,
  baseUrl: string,
  ean: string,
): Promise<VtexRawOffer> {
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${encodeURIComponent(ean)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`${store} HTTP ${res.status} para EAN ${ean}`);
  }

  const products = (await res.json()) as VtexProduct[];
  if (!Array.isArray(products) || products.length === 0) {
    return {
      store,
      ean,
      found: false,
      teasers: [],
      extractedPromotions: [],
    };
  }

  const product = products[0];
  const item = product.items?.[0];
  if (!item) {
    return {
      store,
      ean,
      found: false,
      productName: product.productName,
      teasers: [],
      extractedPromotions: [],
    };
  }

  const sellers = item.sellers ?? [];
  const seller = sellers.find((s) => s.sellerDefault) ?? sellers[0];
  const offer = seller?.commertialOffer;
  if (!offer) {
    return {
      store,
      ean,
      found: true,
      productName: product.productName,
      teasers: [],
      extractedPromotions: [],
    };
  }

  const promotionTeasers = mapTeasers(offer.PromotionTeasers, "PromotionTeasers");
  const teasers = mapTeasers(offer.Teasers, "Teasers");
  const allTeasers = [...promotionTeasers, ...teasers];
  const price = Number(offer.Price ?? 0);
  const productClusters = product.productClusters;
  const clusterPromoLabels = filterProductClusterLabels(
    CENCOSUD_CLUSTER_STORES.has(store) ? productClusters : undefined,
  );
  const classifiedClusters = clusterPromoLabels.map((label) =>
    classifyPromoText(label),
  );

  return {
    store,
    ean,
    found: true,
    productName: product.productName,
    url:
      product.link ??
      (product.linkText ? `${base}/${product.linkText}/p` : undefined),
    price,
    listPrice: Number(offer.ListPrice ?? offer.Price ?? 0),
    priceWithoutDiscount: Number(offer.PriceWithoutDiscount ?? 0) || undefined,
    priceValidUntil: offer.PriceValidUntil,
    availableQuantity: offer.AvailableQuantity,
    discountHighlight: offer.DiscountHighLight ?? offer.DiscountHighlights,
    teasers: allTeasers,
    productClusters,
    clusterPromoLabels,
    classifiedClusters,
    extractedPromotions: extractPromotions(
      [...(offer.PromotionTeasers ?? []), ...(offer.Teasers ?? [])],
      price,
      clusterPromoLabels,
    ),
    commertialOfferKeys: Object.keys(offer).sort(),
  };
}
