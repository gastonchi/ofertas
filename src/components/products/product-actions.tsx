import {
  deleteProductAction,
  toggleProductActiveAction,
} from "@/modules/products/actions";
import { EditProductPanel } from "@/components/products/product-form";
import type { TrackedProductRow } from "@/lib/types";

export function ProductActions({ product }: { product: TrackedProductRow }) {
  return (
    <div className="card-actions">
      <EditProductPanel product={product} />
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
    </div>
  );
}
