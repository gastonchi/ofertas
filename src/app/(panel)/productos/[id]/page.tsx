import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProductStats } from "@/components/products/product-stats";
import { StoreLogoList } from "@/components/ui/store-logo";
import { formatArs } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/env";
import { getProduct, getProductPriceStats } from "@/modules/products/queries";

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

  const stats = await getProductPriceStats(product);

  return (
    <AppShell title={product.name} pathname="/productos">
      <div className="panel-head">
        <p className="muted product-stats-meta" style={{ margin: 0 }}>
          EAN <code className="mono">{product.ean}</code>
          {" · "}
          Objetivo {formatArs(Number(product.target_price))}
          <StoreLogoList stores={product.stores} size="sm" />
        </p>
        <Link href="/productos" className="btn-ghost">
          Volver a productos
        </Link>
      </div>
      <ProductStats stats={stats} />
    </AppShell>
  );
}
