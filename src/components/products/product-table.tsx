"use client";

import { useMemo, useState } from "react";
import { ProductActions, ProductAlertsToggle } from "@/components/products/product-actions";
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
      </dl>
      <ProductActions product={product} />
    </article>
  );
}

export function ProductTable({ products }: { products: TrackedProductRow[] }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(needle) ||
        product.ean.toLowerCase().includes(needle)
      );
    });
  }, [products, query]);

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
      <div className="data-table-toolbar-row product-search-row">
        <label className="data-table-search">
          <span className="sr-only">Buscar por nombre o EAN</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o EAN"
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">
          No hay productos que coincidan con la búsqueda.
        </p>
      ) : (
        <>
          <div className="table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>EAN</th>
                  <th>Objetivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
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
                      <ProductActions product={product} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-grid mobile-only">
            {rows.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
