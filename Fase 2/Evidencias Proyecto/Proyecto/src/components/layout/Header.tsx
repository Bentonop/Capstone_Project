"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  profileLink?: string;
}

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creado_en: string;
  clase_id: number;
}

export default function Header({ title = "Cuerpo y Alma", subtitle = "Inicio", profileLink = "#" }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [filter, setFilter] = useState<"todas" | "importantes" | "no_leidas">("todas");
  const unreadCount = notificaciones.filter(n => !n.leida).length;

  useEffect(() => {
    // 1. Cargar notificaciones iniciales (MVP: cargamos las últimas 20 para filtrar bien)
    const fetchNotificaciones = async () => {
      try {
        const { data, error } = await supabase
          .from('notificaciones')
          .select('*')
          .order('creado_en', { ascending: false })
          .limit(20);

        if (!error && data) {
          setNotificaciones(data);
        }
      } catch (err) {
        // Ignorar si la tabla aún no existe
      }
    };

    fetchNotificaciones();

    // 2. Suscribirse a cambios en tiempo real
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
        },
        (payload) => {
          setNotificaciones((current) => [payload.new as Notificacion, ...current].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
      setNotificaciones(current => 
        current.map(n => n.id === id ? { ...n, leida: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getIconForType = (tipo: string) => {
    switch(tipo) {
      case 'critica': 
        return (
          <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">report</span>
          </div>
        );
      case 'operativa': 
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        );
      default: 
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
        );
    }
  };

  const filteredNotifs = notificaciones.filter(n => {
    if (filter === "no_leidas") return !n.leida;
    if (filter === "importantes") return n.tipo === "critica" || n.tipo === "operativa";
    return true;
  }).slice(0, 5); // Mostrar máximo 5 en el panel

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            {/* Logo placeholder */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-on-primary">
              CA
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">
                {title}
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                {subtitle}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-space-xs relative">
            <button 
              aria-label="Notificaciones" 
              onClick={() => setIsOpen(!isOpen)}
              className="w-11 h-11 relative flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse border border-surface"></span>
              )}
            </button>
            <Link href={profileLink} className="relative flex items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-transform">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Panel de Notificaciones (Bottom Sheet / Panel flotante) */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-start sm:justify-end sm:p-4 bg-black/40 sm:bg-transparent backdrop-blur-[2px] sm:backdrop-blur-none" onClick={() => setIsOpen(false)}>
          <div 
            className="w-full sm:w-[380px] bg-surface sm:mt-14 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-top-4 h-[75vh] sm:h-auto sm:max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle for bottom sheet */}
            <div className="w-10 h-1.5 bg-surface-variant/50 rounded-full mx-auto mt-3 mb-1 sm:hidden"></div>

            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="font-headline-md font-bold text-on-surface">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary px-2.5 py-1 rounded-full text-xs font-bold">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {/* Filtros */}
            <div className="px-5 pb-4 flex gap-2 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setFilter("todas")}
                className={`px-4 py-1.5 rounded-full font-label-md transition-colors ${filter === "todas" ? 'bg-[#d4af37] text-white font-bold' : 'bg-surface border border-surface-container-highest text-on-surface-variant'}`}
              >
                Todas
              </button>
              <button 
                onClick={() => setFilter("importantes")}
                className={`px-4 py-1.5 rounded-full font-label-md transition-colors ${filter === "importantes" ? 'bg-[#d4af37] text-white font-bold' : 'bg-surface border border-surface-container-highest text-on-surface-variant'}`}
              >
                Importantes
              </button>
              <button 
                onClick={() => setFilter("no_leidas")}
                className={`px-4 py-1.5 rounded-full font-label-md transition-colors ${filter === "no_leidas" ? 'bg-[#d4af37] text-white font-bold' : 'bg-surface border border-surface-container-highest text-on-surface-variant'}`}
              >
                No leídas
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
              {filteredNotifs.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                  <span className="material-symbols-outlined text-[40px] text-surface-container-highest">done_all</span>
                  <p className="font-body-md text-on-surface-variant">Estás al día.</p>
                </div>
              ) : (
                filteredNotifs.map(notif => (
                  <Link 
                    href="/admin/notificaciones" 
                    key={notif.id} 
                    onClick={(e) => {
                      if (!notif.leida) handleMarkAsRead(notif.id, e);
                      setIsOpen(false);
                    }}
                    className={`p-4 rounded-2xl flex items-center justify-between transition-colors border ${notif.leida ? 'opacity-60 bg-surface border-surface-container-low' : 'bg-surface-container-lowest border-primary/20 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getIconForType(notif.tipo)}
                      <div className="flex flex-col min-w-0">
                        <p className={`font-label-md truncate ${!notif.leida ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                          {notif.titulo}
                        </p>
                        <p className="font-body-sm text-secondary truncate">
                          {notif.mensaje}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className="font-label-sm text-secondary">
                        {new Date(notif.creado_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="material-symbols-outlined text-surface-variant text-[20px]">chevron_right</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
            
            <div className="p-4 bg-surface text-center pb-safe">
              <Link 
                href="/admin/notificaciones" 
                onClick={() => setIsOpen(false)}
                className="text-[#d4af37] font-label-md font-bold hover:underline inline-flex items-center gap-1"
              >
                Ver historial completo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
