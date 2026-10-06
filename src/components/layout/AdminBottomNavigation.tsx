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
    },
    {
      href: "/admin/ajustes",
      icon: "settings",
      label: "Config",
      match: "/admin/ajustes"
    }
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
      <div className="px-margin-mobile pb-space-xs pt-space-2xs">
        <div className="pointer-events-auto h-bottom-nav-height bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_12px_32px_-4px_rgba(17,22,37,0.08),0_4px_12px_-2px_rgba(17,22,37,0.03)] flex items-center justify-around px-space-2xs border border-secondary/20">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.match);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? "text-secondary font-label-lg"
                    : "text-on-surface-variant hover:text-on-surface"
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
      </div>
    </nav>
  );
}
