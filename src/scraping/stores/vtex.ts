import type { OfferSnapshot, PromotionInfo, StoreId } from "../../lib/types";
import { computePromoPricing } from "../offers/pricing";
import {
  filterProductClusterLabels,
  isPaymentOnlyPromo,
  looksLikePromoText,
} from "../promotions/text-patterns";
import { CENCOSUD_CLUSTER_STORES } from "../promotions/vtex-bases";

type VtexTeaser = {
  Name?: string;
  Conditions?: { MinimumQuantity?: number };
  "<Name>k__BackingField"?: string;
  "<Conditions>k__BackingField"?: { "<MinimumQuantity>k__BackingField"?: number };
};

type VtexProduct = {
  productName?: string;
  linkText?: string;
  link?: string;
  productClusters?: Record<string, string>;
  clusterHighlights?: Record<string, string>;
  items?: Array<{
    ean?: string;
    images?: Array<{ imageUrl?: string }>;
    sellers?: Array<{
      sellerDefault?: boolean;
      commertialOffer?: {
        Price?: number;
        ListPrice?: number;
        AvailableQuantity?: number;
        Teasers?: VtexTeaser[];
        PromotionTeasers?: VtexTeaser[];
      };
    }>;
  }>;
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

export function extractPromotions(
  teasers: VtexTeaser[] | undefined,
  shelfPrice: number,
  clusterLabels?: string[],
): PromotionInfo[] {
  if (!teasers?.length && !clusterLabels?.length) return [];

  const seen = new Set<string>();
  const out: PromotionInfo[] = [];

  const addPromo = (name: string, minimumQuantity?: number) => {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    const pricing = computePromoPricing(trimmed, shelfPrice, minimumQuantity) ?? undefined;
    out.push({ name: trimmed, minimumQuantity, pricing });
  };

  for (const t of teasers ?? []) {
    const name = teaserName(t);
    if (!name) continue;

    if (isPaymentOnlyPromo(name) && !looksLikePromoText(name, teaserMinQty(t))) {
      continue;
    }

    if (!looksLikePromoText(name, teaserMinQty(t))) continue;

    addPromo(name, teaserMinQty(t));
  }

  for (const label of clusterLabels ?? []) {
    if (!looksLikePromoText(label)) continue;
    if (isPaymentOnlyPromo(label)) continue;
    addPromo(label);
  }

  return out;
}

function pickSeller(item: NonNullable<VtexProduct["items"]>[number]) {
  const sellers = item.sellers ?? [];
  return sellers.find((s) => s.sellerDefault) ?? sellers[0];
}

function pickImageUrl(
  item: NonNullable<VtexProduct["items"]>[number],
): string | undefined {
  const url = item.images?.[0]?.imageUrl?.trim();
  return url || undefined;
}

export async function fetchVtexByEan(opts: {
  store: StoreId;
  baseUrl: string;
  ean: string;
}): Promise<OfferSnapshot | null> {
  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${encodeURIComponent(opts.ean)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ofertas-mvp/0.1 (personal price watcher)",
    },
  });

  if (!res.ok) {
    throw new Error(`${opts.store} HTTP ${res.status} para EAN ${opts.ean}`);
  }

  const products = (await res.json()) as VtexProduct[];
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  const product = products[0];
  const item = product.items?.[0];
  if (!item) return null;

  const seller = pickSeller(item);
  const offer = seller?.commertialOffer;
  if (!offer) return null;

  const teasers = [...(offer.PromotionTeasers ?? []), ...(offer.Teasers ?? [])];
  const price = Number(offer.Price ?? 0);
  const clusterLabels = CENCOSUD_CLUSTER_STORES.has(opts.store)
    ? filterProductClusterLabels(product.productClusters)
    : undefined;

  return {
    store: opts.store,
    ean: opts.ean,
    productName: product.productName ?? "Producto sin nombre",
    url:
      product.link ??
      (product.linkText ? `${base}/${product.linkText}/p` : undefined),
    imageUrl: pickImageUrl(item),
    price,
    listPrice: Number(offer.ListPrice ?? offer.Price ?? 0),
    available: (offer.AvailableQuantity ?? 0) > 0,
    promotions: extractPromotions(teasers, price, clusterLabels),
    checkedAt: new Date().toISOString(),
  };
}
