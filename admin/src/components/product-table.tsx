import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/actions/products";
import { EditProductPanel } from "@/components/product-form";
import { formatArs } from "@/lib/format";
import { STORE_LABELS } from "@/lib/stores";
import type { StoreId, TrackedProductRow } from "@/lib/types";

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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>EAN</th>
            <th>Objetivo</th>
            <th>Tiendas</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={product.active ? undefined : "dimmed"}>
              <td>
                <div className="product-name">{product.name}</div>
                <EditProductPanel product={product} />
              </td>
              <td>
                <code className="mono">{product.ean}</code>
              </td>
              <td>{formatArs(Number(product.target_price))}</td>
              <td>
                <span className="store-chips">
                  {product.stores.map((store) => (
                    <span key={store} className="chip">
                      {STORE_LABELS[store as StoreId] ?? store}
                    </span>
                  ))}
                </span>
              </td>
              <td>
                <form action={toggleProductActiveAction}>
                  <input type="hidden" name="id" value={product.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={product.active ? "true" : "false"}
                  />
                  <button type="submit" className="status-btn">
                    {product.active ? "Activo" : "Pausado"}
                  </button>
                </form>
              </td>
              <td>
                <form action={deleteProductAction}>
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    className="btn-danger"
                    aria-label={`Eliminar ${product.name}`}
                  >
                    Eliminar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
