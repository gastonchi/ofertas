import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "Resumen" },
  { href: "/productos", label: "Productos" },
  { href: "/alertas", label: "Alertas" },
];

export function AdminShell({
  title,
  children,
  pathname,
}: {
  title: string;
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-block">
          <p className="brand-mark">Ofertas</p>
          <p className="brand-sub">Panel admin</p>
        </div>
        <nav className="admin-nav" aria-label="Principal">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="logout-form">
          <button type="submit" className="btn-ghost">
            Salir
          </button>
        </form>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <h1>{title}</h1>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
