import { AppShell } from "@/components/layout/app-shell";
import {
  ProductNewTitleAction,
  ProductPageActionsProvider,
  ProductPageToolbar,
} from "@/components/products/product-page-actions";
import { ProductTable } from "@/components/products/product-table";
import { resolveEnabledStores } from "@/lib/stores";
import { hasSupabaseConfig } from "@/lib/env";
import { listProducts } from "@/modules/products/actions";
import { enrichProductsImages } from "@/modules/products/queries";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const configured = hasSupabaseConfig();
  const settings = configured ? await getSettings() : null;
  const trackedStores = resolveEnabledStores(settings?.default_stores);
  const rawProducts = configured ? await listProducts() : [];
  const products = configured
    ? await enrichProductsImages(rawProducts, trackedStores)
    : [];

  return (
    <ProductPageActionsProvider trackedStores={trackedStores}>
      <AppShell
        title="Productos"
        pathname="/productos"
        titleAction={<ProductNewTitleAction />}
      >
        {!configured ? (
          <p className="setup-banner">
            Faltan <code>SUPABASE_URL</code> y{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>
        ) : null}
        <div className="panel-head">
          <p className="muted" style={{ margin: 0 }}>
            Estos productos se chequean en los días y horarios de Configuración.
          </p>
          <ProductPageToolbar />
        </div>
        <div className="panel">
          <ProductTable products={products} />
        </div>
      </AppShell>
    </ProductPageActionsProvider>
  );
}
