import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProductStats } from "@/components/products/product-stats";
import { formatArs } from "@/lib/format";
import { resolveEnabledStores } from "@/lib/stores";
import { hasSupabaseConfig } from "@/lib/env";
import { getProduct, getProductPriceStats, productHasPriceToday } from "@/modules/products/queries";
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
  const product = configured ? await getProduct(id) : null;

  if (!product) notFound();

  const settings = configured ? await getSettings() : null;
  const trackedStores = resolveEnabledStores(settings?.default_stores);
  const stats = await getProductPriceStats(product, trackedStores);
  const canRefreshPrice = !(await productHasPriceToday(product));

  return (
    <AppShell
      title={product.name}
      pathname="/productos"
      titleAction={
        canRefreshPrice ? (
          <RefreshProductPriceButton productId={product.id} />
        ) : null
      }
    >
      <div className="panel-head">
        <p className="muted product-stats-meta" style={{ margin: 0 }}>
          EAN <code className="mono">{product.ean}</code>
          {" · "}
          Objetivo {formatArs(Number(product.target_price))}
        </p>
        <Link href="/productos" className="btn-ghost">
          Volver a productos
        </Link>
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
