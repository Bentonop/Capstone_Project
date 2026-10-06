"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RoleSelectionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-margin-mobile bg-surface text-on-surface">
      <div className="flex flex-col items-center gap-space-sm mb-space-2xl">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center font-bold text-on-primary text-2xl shadow-lg">
          CA
        </div>
        <h1 className="font-display text-display text-center tracking-tight leading-tight mt-4">
          Cuerpo y Alma
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-sm">
          Plataforma de gestión de clases y reservas.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-space-md">
        <h2 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant text-center mb-2">
          Selecciona tu rol para ingresar (Fase de Pruebas)
        </h2>

        {/* Student Button */}
        <Link 
          href="/alumno/dashboard"
          className="w-full h-16 rounded-2xl bg-surface-container-low border border-surface-container shadow-sm flex items-center p-4 gap-4 hover:border-primary hover:bg-surface-container transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-headline-sm text-headline-sm font-bold">Modo Alumno</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Reservas, pagos y pases QR</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward_ios</span>
        </Link>

        {/* Professor Button */}
        <Link 
          href="/profesor/dashboard"
          className="w-full h-16 rounded-2xl bg-surface-container-low border border-surface-container shadow-sm flex items-center p-4 gap-4 hover:border-tertiary hover:bg-surface-container transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0 group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
            <span className="material-symbols-outlined text-[24px]">sports_martial_arts</span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-headline-sm text-headline-sm font-bold">Modo Profesor</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Asistencia, horarios y alumnos</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors">arrow_forward_ios</span>
        </Link>

        {/* Admin Button */}
        <Link 
          href="/admin/dashboard"
          className="w-full h-16 rounded-2xl bg-surface-container-low border border-surface-container shadow-sm flex items-center p-4 gap-4 hover:border-secondary hover:bg-surface-container transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
            <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-headline-sm text-headline-sm font-bold">Modo Admin</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Gestión de academia y relevos</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">arrow_forward_ios</span>
        </Link>
      </div>

      <div className="mt-auto pt-space-2xl pb-safe">
        <p className="font-label-md text-label-md text-on-surface-variant text-center">
          Ritmo Studio &copy; 2025
        </p>
      </div>
    </div>
  );
}
