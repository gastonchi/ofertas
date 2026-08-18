import Link from "next/link";
import {
  Bell,
  House,
  LogOut,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/modules/auth/actions";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppShell({
  title,
  children,
  pathname,
}: {
  title: string;
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <p className="brand-mark">Ofertas</p>
          <p className="brand-sub">Tu panel</p>
        </div>
        <nav className="app-nav" aria-label="Principal">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                <item.icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="logout-form">
          <button type="submit" className="btn-ghost">
            <LogOut size={18} aria-hidden />
            Salir
          </button>
        </form>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <h1>{title}</h1>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
