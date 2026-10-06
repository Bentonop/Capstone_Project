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
      <div className="h-16 bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.4),0_4px_12px_-2px_rgba(0,0,0,0.2)] flex items-center justify-around px-space-xs border border-surface-container">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname === '/' && item.path === '/alumno/dashboard');
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors gap-0.5 ${
                isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
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
