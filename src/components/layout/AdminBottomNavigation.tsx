"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminBottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/admin/dashboard",
      icon: "crisis_alert",
      label: "Urgencias",
      match: "/admin/dashboard"
    },
    {
      href: "/admin/clases",
      icon: "event",
      label: "Gestión",
      match: "/admin/clases"
    },
    {
      href: "/admin/planes",
      icon: "storefront",
      label: "Planes",
      match: "/admin/planes"
    },
    {
      href: "/admin/alumnos",
      icon: "group",
      label: "Alumnos",
      match: "/admin/alumnos"
    }
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-50 px-margin-mobile pb-safe pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto h-bottom-nav-height glass-panel flex items-center justify-around px-space-xs shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.match);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "bottom-nav-active font-label-lg"
                  : "bottom-nav-inactive hover:text-main"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
              <span className="font-label-md text-label-md text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
