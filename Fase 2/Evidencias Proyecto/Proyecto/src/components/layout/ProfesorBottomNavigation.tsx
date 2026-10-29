"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfesorBottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/profesor/dashboard",
      icon: "calendar_today",
      label: "Mi Agenda",
      match: "/profesor/dashboard"
    },
    {
      href: "/profesor/metricas",
      icon: "monitoring",
      label: "Métricas",
      match: "/profesor/metricas"
    },
    {
      href: "/profesor/perfil",
      icon: "badge",
      label: "Perfil Pro",
      match: "/profesor/perfil"
    }
  ];

  return (
    <nav className="fixed bottom-3 inset-x-margin-mobile z-50 pb-safe">
      <div className="h-16 glass-panel flex items-center justify-around px-space-xs">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.match);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors gap-0.5 ${
                isActive ? "bottom-nav-active font-bold" : "bottom-nav-inactive hover:text-main"
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? "[font-variation-settings:'FILL'1]" : ""}`}>
                {item.icon}
              </span>
              <span className="font-label-md text-label-md text-center leading-none mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
