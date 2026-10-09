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
  const unreadCount = notificaciones.filter(n => !n.leida).length;

  useEffect(() => {
    // 1. Cargar notificaciones iniciales (MVP: cargamos las últimas 5)
    const fetchNotificaciones = async () => {
      try {
        const { data, error } = await supabase
          .from('notificaciones')
          .select('*')
          .order('creado_en', { ascending: false })
          .limit(5);

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
          setNotificaciones((current) => [payload.new as Notificacion, ...current].slice(0, 5));
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
      case 'critica': return <span className="material-symbols-outlined text-error text-[20px]">report</span>;
      case 'operativa': return <span className="material-symbols-outlined text-emerald-500 text-[20px]">play_circle</span>;
      default: return <span className="material-symbols-outlined text-primary text-[20px]">info</span>;
    }
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] pt-safe">
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
              onClick={() => setIsOpen(true)}
              className="w-11 h-11 relative flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-error rounded-full animate-pulse border-2 border-surface"></span>
              )}
            </button>
            <Link href={profileLink} className="relative flex items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-transform">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest shadow-[0_2px_6px_rgba(17,22,37,0.08)] flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Panel de Notificaciones (Bottom Sheet en móvil, Dropdown en Desktop) */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-start sm:justify-end sm:p-4 bg-black/40 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none" onClick={() => setIsOpen(false)}>
          <div 
            className="w-full sm:w-[380px] bg-surface sm:mt-14 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-top-4 border border-surface-container"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">dynamic_feed</span>
                <h3 className="font-headline-sm text-on-surface">Centro de Actividad</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 flex flex-col gap-1">
              {notificaciones.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                  <span className="material-symbols-outlined text-[40px] text-surface-container-highest">notifications_off</span>
                  <p className="font-body-md text-on-surface-variant">No hay notificaciones recientes</p>
                </div>
              ) : (
                notificaciones.map(notif => (
                  <div key={notif.id} className={`p-3 rounded-xl flex items-start gap-3 transition-colors hover:bg-surface-container/50 ${notif.leida ? 'opacity-70' : 'bg-surface-container-lowest border border-primary/10 shadow-sm'}`}>
                    <div className="mt-1 flex-shrink-0">
                      {getIconForType(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-label-md text-on-surface mb-0.5 ${!notif.leida ? 'font-bold' : ''}`}>
                        {notif.titulo}
                      </p>
                      <p className="font-body-sm text-on-surface-variant leading-snug">
                        {notif.mensaje}
                      </p>
                      <p className="font-label-sm text-secondary mt-1 opacity-70">
                        {new Date(notif.creado_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                      </p>
                    </div>
                    {!notif.leida && (
                      <button 
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                        title="Marcar como leída"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-surface-container bg-surface-container-lowest">
              <Link 
                href="/admin/notificaciones" 
                onClick={() => setIsOpen(false)}
                className="w-full h-10 bg-primary/10 text-primary font-label-md font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Ver todo el historial
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
