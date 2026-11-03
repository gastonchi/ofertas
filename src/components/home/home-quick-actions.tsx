"use client";

import Link from "next/link";
import { ChevronRight, Package, Search, Wallet } from "lucide-react";
import { LookupPricesPanel } from "@/components/products/lookup-prices-panel";
import { useProductPageActions } from "@/components/products/product-page-actions";

export function HomeQuickActions() {
  const { openCreate, trackedStores } = useProductPageActions();

  return (
    <section className="home-quick" aria-label="Accesos rápidos">
      <p className="home-quick-lead muted">
        Elegí qué querés hacer en un toque.
      </p>
      <div className="home-quick-grid">
        <Link href="/productos" className="home-quick-card">
          <span className="home-quick-icon" aria-hidden>
            <Package size={28} />
          </span>
          <span className="home-quick-text">
            <strong>Productos</strong>
            <span className="muted">Ver seguimiento y precios</span>
          </span>
          <ChevronRight size={22} className="home-quick-chevron" aria-hidden />
        </Link>

        <Link href="/gastos" className="home-quick-card">
          <span className="home-quick-icon" aria-hidden>
            <Wallet size={28} />
          </span>
          <span className="home-quick-text">
            <strong>Cargar nuevo gasto</strong>
            <span className="muted">Registrar una compra o pago</span>
          </span>
          <ChevronRight size={22} className="home-quick-chevron" aria-hidden />
        </Link>

        <LookupPricesPanel
          trackedStores={trackedStores}
          onAddProduct={(draft) => openCreate(draft)}
          renderTrigger={(open) => (
            <button type="button" className="home-quick-card" onClick={open}>
              <span className="home-quick-icon" aria-hidden>
                <Search size={28} />
              </span>
              <span className="home-quick-text">
                <strong>Consultar precio</strong>
                <span className="muted">Buscar por código de barras</span>
              </span>
              <ChevronRight
                size={22}
                className="home-quick-chevron"
                aria-hidden
              />
            </button>
          )}
        />
      </div>
    </section>
  );
}
