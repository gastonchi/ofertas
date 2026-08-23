import { AppShell } from "@/components/layout/app-shell";
import { ProductPageActions } from "@/components/products/product-page-actions";
import { ProductTable } from "@/components/products/product-table";
import { hasSupabaseConfig } from "@/lib/env";
import { listProducts } from "@/modules/products/actions";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const configured = hasSupabaseConfig();
  const products = configured ? await listProducts() : [];
  const settings = configured ? await getSettings() : null;

  return (
    <AppShell title="Productos" pathname="/productos">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      <div className="panel-head">
        <p className="muted" style={{ margin: 0 }}>
          Estos productos se chequean en los días y horarios de Configuración.
      
        </p>
        <ProductPageActions defaultStores={settings?.default_stores} />
      </div>
      <div className="panel">
        <ProductTable products={products} />
      </div>
    </AppShell>
  );
}
