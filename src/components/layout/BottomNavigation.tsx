"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", path: "/alumno/dashboard", icon: "home" },
    { name: "Tienda", path: "/alumno/tienda", icon: "store" },
    { name: "Explorar", path: "/alumno/explorar", icon: "calendar_month" },
    { name: "Mis Clases", path: "/alumno/mis-clases", icon: "check_circle" },
  ];

  return (
    <nav className="fixed bottom-3 inset-x-margin-mobile z-50 pb-safe">
      <div className="h-16 glass-panel flex items-center justify-around px-space-xs">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname === '/' && item.path === '/alumno/dashboard');
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors gap-0.5 ${
                isActive ? "bottom-nav-active font-bold" : "bottom-nav-inactive hover:text-main"
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? "[font-variation-settings:'FILL'1]" : ""}`}>
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
