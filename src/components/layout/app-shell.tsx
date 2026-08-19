"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  Bell,
  House,
  LogOut,
  Menu,
  Package,
  Settings,
  X,
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
  const [open, setOpen] = useState(false);
  const sidebarId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={open ? "app-shell nav-open" : "app-shell"}>
      <header className="mobile-topbar">
        <p className="brand-mark">Ofertas</p>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls={sidebarId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </header>
      <div
        className="sidebar-backdrop"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <aside className="app-sidebar" id={sidebarId}>
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
                onClick={() => setOpen(false)}
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
