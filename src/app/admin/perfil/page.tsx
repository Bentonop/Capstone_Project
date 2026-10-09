"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, UserCircle2, ShieldCheck, Users, CalendarDays, Receipt } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      toast.success("Sesión cerrada correctamente");
      router.push("/");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-margin-mobile py-space-sm space-y-space-md animate-fade-in">
      
      {/* Tarjeta de Perfil */}
      <div className="glass-panel p-space-sm flex items-center gap-space-sm">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-inner">
          <UserCircle2 className="w-10 h-10 text-on-primary" />
        </div>
        <div>
          <h2 className="font-headline-sm text-on-surface">
            {profile ? `${profile.name} ${profile.last_name || ""}` : "Cargando..."}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
            <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
              {profile?.role || "Administrador"}
            </span>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {profile?.correo}
          </p>
        </div>
      </div>

      {/* Instrucciones / Permisos */}
      <div className="space-y-space-xs">
        <h3 className="font-title-md text-on-surface flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Permisos de Coordinación
        </h3>
        
        <div className="glass-panel p-space-sm space-y-4">
          <p className="font-body-sm text-on-surface-variant">
            Como administrador, tienes acceso total al sistema de Ritmo Studio. Aquí puedes encontrar un resumen de tus herramientas:
          </p>
          
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-label-md text-on-surface">Gestión de Alumnos y Profesores</p>
                <p className="font-body-sm text-on-surface-variant mt-0.5">Invita a nuevos usuarios (whitelist), revisa fichas médicas y administra perfiles.</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-label-md text-on-surface">Agenda de Clases</p>
                <p className="font-body-sm text-on-surface-variant mt-0.5">Crea, edita y cancela clases. Revisa la asistencia en tiempo real de cualquier profesor.</p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-label-md text-on-surface">Planes y Finanzas</p>
                <p className="font-body-sm text-on-surface-variant mt-0.5">Aprueba pagos pendientes, vende nuevos planes y gestiona los catálogos de membresías.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Botón Cerrar Sesión */}
      <div className="pt-space-sm">
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-error/10 text-error hover:bg-error/20 active:scale-[0.98] transition-all font-label-lg"
        >
          <LogOut className="w-5 h-5" />
          {loading ? "Cerrando sesión..." : "Cerrar Sesión"}
        </button>
      </div>

    </div>
  );
}
