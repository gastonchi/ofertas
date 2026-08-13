import { AdminShell } from "@/components/admin-shell";
import { NewProductPanel } from "@/components/product-form";
import { ProductTable } from "@/components/product-table";
import { listProducts } from "@/app/actions/products";
import { hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const configured = hasSupabaseConfig();
  const products = configured ? await listProducts() : [];

  return (
    <AdminShell title="Productos" pathname="/productos">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <p className="muted" style={{ margin: 0 }}>
          Fuente de verdad para el job de chequeo de ofertas.
        </p>
        <NewProductPanel />
      </div>
      <div className="panel">
        <ProductTable products={products} />
      </div>
    </AdminShell>
  );
}
