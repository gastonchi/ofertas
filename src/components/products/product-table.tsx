import { ProductActions, ProductAlertsToggle } from "@/components/products/product-actions";
import { StoreLogoList } from "@/components/ui/store-logo";
import { formatArs } from "@/lib/format";
import type { TrackedProductRow } from "@/lib/types";

function ProductCard({ product }: { product: TrackedProductRow }) {
  return (
    <article className={`info-card ${product.active ? "" : "dimmed"}`.trim()}>
      <header className="info-card-head">
        <h3 className="product-name">{product.name}</h3>
        <ProductAlertsToggle product={product} />
      </header>
      <dl className="info-card-meta">
        <div>
          <dt>EAN</dt>
          <dd>
            <code className="mono">{product.ean}</code>
          </dd>
        </div>
        <div>
          <dt>Objetivo</dt>
          <dd>{formatArs(Number(product.target_price))}</dd>
        </div>
        <div className="info-card-span">
          <dt>Tiendas</dt>
          <dd>
            <StoreLogoList stores={product.stores} />
          </dd>
        </div>
      </dl>
      <ProductActions product={product} />
    </article>
  );
}

export function ProductTable({ products }: { products: TrackedProductRow[] }) {
  if (products.length === 0) {
    return (
      <p className="empty-state">
        Todavía no hay productos. Agregá el primero o ejecutá{" "}
        <code>supabase/seed-products.sql</code>.
      </p>
    );
  }

  return (
    <>
      <div className="table-wrap desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>EAN</th>
              <th>Objetivo</th>
              <th>Tiendas</th>
              <th>Alertas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className={product.active ? undefined : "dimmed"}
              >
                <td>
                  <div className="product-name">{product.name}</div>
                </td>
                <td>
                  <code className="mono">{product.ean}</code>
                </td>
                <td>{formatArs(Number(product.target_price))}</td>
                <td>
                  <StoreLogoList stores={product.stores} />
                </td>
                <td>
                  <ProductAlertsToggle product={product} />
                </td>
                <td>
                  <ProductActions product={product} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-grid mobile-only">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
