import { AppShell } from "@/components/layout/app-shell";
import { NewProductPanel } from "@/components/products/product-form";
import { ProductTable } from "@/components/products/product-table";
import { hasSupabaseConfig } from "@/lib/env";
import { listProducts } from "@/modules/products/actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const configured = hasSupabaseConfig();
  const products = configured ? await listProducts() : [];

  return (
    <AppShell title="Productos" pathname="/productos">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <p className="muted" style={{ margin: 0 }}>
          Estos productos se chequean dos veces al día. Si hay oferta, te llega un
          mail.
        </p>
        <NewProductPanel />
      </div>
      <div className="panel">
        <ProductTable products={products} />
      </div>
    </AppShell>
  );
}
