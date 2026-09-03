import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ProductBackLink() {
  return (
    <Link
      href="/productos"
      className="btn-secondary btn-icon app-header-back"
      aria-label="Volver a productos"
      title="Volver a productos"
    >
      <ArrowLeft size={20} aria-hidden />
    </Link>
  );
}
