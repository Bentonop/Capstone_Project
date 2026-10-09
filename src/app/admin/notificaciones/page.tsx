"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creado_en: string;
  clase_id: number;
}

export default function AdminNotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetails, setClassDetails] = useState<any>(null);
  const [isLoadingClass, setIsLoadingClass] = useState(false);

  useEffect(() => {
    fetchNotificaciones();
  }, []);

  async function fetchNotificaciones() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      if (data) setNotificaciones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
      setNotificaciones(current => 
        current.map(n => n.id === id ? { ...n, leida: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notificaciones.filter(n => !n.leida).map(n => n.id);
      if (unreadIds.length === 0) return;
      
      await supabase.from('notificaciones').update({ leida: true }).in('id', unreadIds);
      setNotificaciones(current => current.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenClass = async (claseId: number) => {
    setSelectedClassId(claseId);
    setIsLoadingClass(true);
    setClassDetails(null);
    try {
      const { data, error } = await supabase
        .from('clase')
        .select('*, profiles:id_profesor(name, last_name)')
        .eq('id_clase', claseId)
        .single();
        
      if (error) throw error;
      if (data) setClassDetails(data);
    } catch (err) {
      console.error(err);
      setClassDetails({ error: "No se pudo cargar la clase o ya fue eliminada." });
    } finally {
      setIsLoadingClass(false);
    }
  };

  const getIconForType = (tipo: string) => {
    switch(tipo) {
      case 'critica': return <span className="material-symbols-outlined text-error text-[24px]">report</span>;
      case 'operativa': return <span className="material-symbols-outlined text-emerald-500 text-[24px]">play_circle</span>;
      default: return <span className="material-symbols-outlined text-primary text-[24px]">info</span>;
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-24">
      <section className="px-gutter-mobile pt-space-md">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-headline-md text-headline-md text-on-surface">Historial de Notificaciones</h1>
          {notificaciones.some(n => !n.leida) && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-primary font-label-sm font-bold bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              Marcar todo leído
            </button>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-secondary mb-space-md">
          Revisa todas las alertas y eventos del sistema.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <span className="material-symbols-outlined animate-spin text-secondary text-3xl">refresh</span>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[32px]">notifications_off</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Bandeja vacía</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No tienes notificaciones en tu historial.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notificaciones.map(notif => (
              <article 
                key={notif.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  notif.leida 
                    ? 'bg-surface border-surface-container opacity-80' 
                    : 'bg-surface-container-lowest border-primary/20 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notif.leida ? 'bg-surface-container' : 'bg-primary/10'}`}>
                    {getIconForType(notif.tipo)}
                  </div>
                  
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-headline-sm text-headline-sm truncate ${!notif.leida ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                        {notif.titulo}
                      </h3>
                      <span className="font-label-sm text-secondary whitespace-nowrap">
                        {new Date(notif.creado_en).toLocaleDateString('es-CL')} {new Date(notif.creado_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="font-body-md text-on-surface-variant mt-1">
                      {notif.mensaje}
                    </p>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-container">
                      {notif.clase_id && (
                        <button 
                          onClick={() => handleOpenClass(notif.clase_id)}
                          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl font-label-md font-bold flex items-center gap-2 flex-1 justify-center active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                          Ver Clase
                        </button>
                      )}
                      
                      {!notif.leida && (
                        <button 
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-label-md font-bold flex items-center gap-2 flex-1 justify-center active:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">done_all</span>
                          Leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* MODAL DETALLE DE CLASE */}
      {selectedClassId && (
        <div className="fixed inset-0 z-[70] bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full bg-surface-container-lowest rounded-t-3xl p-6 shadow-2xl flex flex-col gap-4 max-w-lg animate-in slide-in-from-bottom pb-safe max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-headline-md font-bold text-on-surface">Detalle de la Clase</h3>
              <button onClick={() => setSelectedClassId(null)} className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {isLoadingClass ? (
              <div className="flex justify-center p-8">
                <span className="material-symbols-outlined animate-spin text-secondary text-3xl">refresh</span>
              </div>
            ) : classDetails?.error ? (
              <div className="p-4 bg-error-container text-on-error-container rounded-xl font-body-md text-center">
                {classDetails.error}
              </div>
            ) : classDetails ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-[10px] font-bold ${
                      classDetails.estado_clase === 'en_curso' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 
                      classDetails.estado_clase === 'cancelada' ? 'bg-error/10 text-error border border-error/20' : 
                      'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {classDetails.estado_clase?.toUpperCase() || 'DESCONOCIDO'}
                    </span>
                    <span className="font-label-sm text-secondary">{classDetails.sala || 'Sala Principal'}</span>
                  </div>
                  
                  <h2 className="font-headline-sm font-bold text-on-surface mb-4">
                    {classDetails.nombre_clase}
                  </h2>
                  
                  <div className="flex flex-col gap-3 font-body-sm text-on-surface-variant">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-secondary">person</span>
                      <span>Profesor: <strong className="text-on-surface">{classDetails.profiles?.name} {classDetails.profiles?.last_name}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-secondary">schedule</span>
                      <span>
                        {new Date(classDetails.fecha_hora_inicio).toLocaleDateString('es-CL')} • {new Date(classDetails.fecha_hora_inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(classDetails.fecha_hora_fin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-secondary">group</span>
                      <span>Asistencia / Inscritos: <strong className="text-on-surface">{classDetails.cupos_inscritos || 0} / {classDetails.cupo_maximo || 8}</strong></span>
                    </div>
                  </div>
                </div>
                
                {classDetails.descripcion && (
                  <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container">
                    <span className="font-label-sm font-bold block mb-1">Notas / Motivo:</span>
                    <p className="font-body-sm italic">{classDetails.descripcion}</p>
                  </div>
                )}
              </div>
            ) : null}
            
            <button 
              onClick={() => setSelectedClassId(null)}
              className="w-full h-12 mt-2 bg-surface-container-high text-on-surface font-bold rounded-xl active:bg-surface-container transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
