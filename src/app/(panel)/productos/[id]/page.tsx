import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProductBackLink } from "@/components/products/product-back-link";
import { ProductStats } from "@/components/products/product-stats";
import { ProductThumb } from "@/components/products/product-thumb";
import { formatArs } from "@/lib/format";
import { resolveEnabledStores } from "@/lib/stores";
import { hasSupabaseConfig } from "@/lib/env";
import {
  ensureProductImage,
  getProduct,
  getProductPriceStats,
  productHasPriceToday,
} from "@/modules/products/queries";
import { RefreshProductPriceButton } from "@/components/products/refresh-product-price-button";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function ProductStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const configured = hasSupabaseConfig();
  const rawProduct = configured ? await getProduct(id) : null;

  if (!rawProduct) notFound();

  const settings = configured ? await getSettings() : null;
  const trackedStores = resolveEnabledStores(settings?.default_stores);
  const product = await ensureProductImage(rawProduct, trackedStores);
  const stats = await getProductPriceStats(product, trackedStores);
  const canRefreshPrice = !(await productHasPriceToday(product));

  return (
    <AppShell
      title={product.name}
      pathname="/productos"
      titleAction={
        <div className="app-header-actions">
          {canRefreshPrice ? (
            <RefreshProductPriceButton productId={product.id} />
          ) : null}
          <ProductBackLink />
        </div>
      }
    >
      <div className="panel-head product-detail-head">
        <ProductThumb
          name={product.name}
          imageUrl={product.image_url}
          size="lg"
        />
        <div className="product-detail-meta">
          <p className="muted product-stats-meta" style={{ margin: 0 }}>
            EAN <code className="mono">{product.ean}</code>
            {" · "}
            Objetivo {formatArs(Number(product.target_price))}
          </p>
        </div>
      </div>
      <ProductStats
        stats={stats}
        emptyAction={
          canRefreshPrice ? (
            <RefreshProductPriceButton productId={product.id} />
          ) : null
        }
      />
    </AppShell>
  );
}
