"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ClassStatus = "scheduled" | "cancelled" | "substitution_requested";

interface ClassSession {
  id: string;
  name: string;
  level: string;
  duration: number;
  timeRange: string;
  room: string;
  enrolled: number;
  maxCapacity: number;
  waitlist: number;
  status: ClassStatus;
}

export default function ProfesorDashboardPage() {
  const [profileName, setProfileName] = useState<string>("Docente");
  const [profileInitials, setProfileInitials] = useState<string>("D");
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [nextClass, setNextClass] = useState<ClassSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    async function fetchProfile() {
      if (!supabase) return;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: user } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        
        if (user && user.name) {
          setProfileName(user.name);
          setProfileInitials(user.name.charAt(0) + (user.last_name ? user.last_name.charAt(0) : ""));
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    async function fetchClasses() {
      setIsLoading(true);
      try {
        if (!supabase) throw new Error("No Supabase Client");
        
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabase
          .from("clase")
          .select("*")
          .eq("id_profesor", authUser.id)
          .gte("fecha_hora_inicio", startOfDay.toISOString())
          .lte("fecha_hora_inicio", endOfDay.toISOString())
          .order("fecha_hora_inicio", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const now = new Date();
          const isToday = selectedDate.toDateString() === now.toDateString();
          
          const filteredData = data.filter((c: any) => {
            if (isToday) {
              const end = new Date(c.fecha_hora_fin);
              return end > now;
            }
            return true;
          });

          const mappedClasses: ClassSession[] = filteredData.map((c: any) => {
            const start = new Date(c.fecha_hora_inicio);
            const end = new Date(c.fecha_hora_fin);
            const duration = Math.round((end.getTime() - start.getTime()) / 60000);
            
            return {
              id: c.id_clase.toString(),
              name: c.nombre_clase,
              level: "Multinivel", 
              duration: duration || 75,
              timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
              room: c.sala || "Sala Principal",
              enrolled: c.cupos_inscritos || 0,
              maxCapacity: c.cupo_maximo || 8,
              waitlist: 0,
              status: c.estado_clase === 'cancelada' ? 'cancelled' : 'scheduled'
            };
          });
          setClasses(mappedClasses);
        } else {
          setClasses([]);
        }

        // Fetch Next Class
        const { data: nextData } = await supabase
          .from("clase")
          .select("*")
          .gt("fecha_hora_inicio", endOfDay.toISOString())
          .order("fecha_hora_inicio", { ascending: true })
          .limit(1)
          .single();
        
        if (nextData) {
          const start = new Date(nextData.fecha_hora_inicio);
          const end = new Date(nextData.fecha_hora_fin);
          const duration = Math.round((end.getTime() - start.getTime()) / 60000);
          setNextClass({
              id: nextData.id_clase.toString(),
              name: nextData.nombre_clase,
              level: "Multinivel", 
              duration: duration || 75,
              timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
              room: nextData.sala || "Sala Principal",
              enrolled: nextData.cupos_inscritos || 0,
              maxCapacity: nextData.cupo_maximo || 8,
              waitlist: 0,
              status: nextData.estado_clase === 'cancelada' ? 'cancelled' : 'scheduled',
              rawDate: start
          } as any);
        } else {
          setNextClass(null);
        }

      } catch (error) {
        console.error("Error fetching classes:", error);
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClasses();
  }, [selectedDate]);

  const totalEnrolled = classes.reduce((sum, cls) => sum + cls.enrolled, 0);
  const scheduledClassesCount = classes.filter(c => c.status === "scheduled").length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCancelModal = (id: string) => {
    setSelectedClassId(id);
    setIsCancelModalOpen(true);
  };

  const handleRequestSubstitution = async () => {
    if (selectedClassId) {
      // 1. Update UI state optimistically
      setClasses(prev => prev.map(c => 
        c.id === selectedClassId ? { ...c, status: "substitution_requested" } : c
      ));
      
      // 2. Update in Supabase (if connected)
      if (supabase) {
        await supabase
          .from("clase")
          .update({ 
            estado_clase: 'cancelada',
            descripcion: cancelReason ? `[CANCELADA] Motivo: ${cancelReason}` : '[CANCELADA]' 
          })
          .eq("id_clase", parseInt(selectedClassId));
      }

      showToast("Solicitud enviada a Coordinación y alumnos notificados.");
    }
    setIsCancelModalOpen(false);
    setSelectedClassId(null);
    setCancelReason("");
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <section className="px-gutter-mobile pt-space-md flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="relative">
              <div className="w-12 h-12 avatar-soft shadow-md">
                {/* Fallback avatar */}
                <div className="w-full h-full flex items-center justify-center font-bold text-lg uppercase">
                  {profileInitials}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary rounded-full shadow-sm"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Ritmo Studio • Docente</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">¡Hola, {profileName}!</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-space-md">
        <div className="flex items-center justify-between px-gutter-mobile mb-space-xs">
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
            {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="font-label-md text-label-md text-primary font-bold flex items-center gap-1"
          >
            <span className="">Hoy</span>
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-gutter-mobile pb-2 snap-x snap-mandatory scrollbar-hide">
          {/* Week Days */}
          {[-2, -1, 0, 1, 2, 3].map((offset, i) => {
             const d = new Date();
             d.setDate(d.getDate() + offset);
             const isSelected = d.toDateString() === selectedDate.toDateString();
             
             return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-2.5 rounded-xl snap-start cursor-pointer transition-all ${isSelected ? 'bg-primary text-on-primary shadow-lg shadow-primary/25 scale-[1.02]' : 'bg-surface-container-lowest shadow-sm text-secondary hover:bg-surface-container-low'}`}
              >
                <span className={`font-label-caps text-label-caps uppercase ${isSelected ? 'text-on-primary/90' : ''}`}>
                  {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                </span>
                <span className={`font-headline-sm text-headline-sm mt-0.5 ${isSelected ? 'text-on-primary' : 'text-on-surface'}`}>
                  {d.getDate()}
                </span>
              </div>
             )
          })}
        </div>
      </section>


      <section className="px-gutter-mobile mt-space-lg flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Horario de Hoy ({selectedDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })})</h3>
          <span className="font-label-md text-label-md text-secondary">{scheduledClassesCount} pendientes</span>
        </div>

        {isLoading ? (
           <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></div>
        ) : classes.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-2xl border border-surface-container mt-2 text-center">
             <span className="material-symbols-outlined text-secondary text-4xl mb-3">event_busy</span>
             <h3 className="font-headline-sm text-on-surface">No hay clases programadas</h3>
             <p className="font-body-sm text-on-surface-variant mt-1">No tienes clases asignadas para esta fecha.</p>
           </div>
        ) : classes.map((cls, index) => {
          const isFull = cls.enrolled >= cls.maxCapacity;
          const progressPercent = (cls.enrolled / cls.maxCapacity) * 100;
          const isSubstitution = cls.status === "substitution_requested";
          const isDark = index === 0 && !isSubstitution;
          
          return (
            <article key={cls.id} className={`p-5 relative overflow-hidden flex flex-col gap-4 ${isSubstitution ? 'card-light border border-surface-container-highest opacity-80' : (isDark ? 'card-dark' : 'card-light')}`}>
              {isSubstitution && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-surface-container-highest rounded-md flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] opacity-70">sync</span>
                  <span className="font-label-md text-label-md opacity-70">Buscando suplente</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-label-caps uppercase ${isFull ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-primary text-on-primary'}`}>
                      {cls.level}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 opacity-80 font-label-caps text-label-caps">{cls.duration} min</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm leading-snug">{cls.name}</h4>
                  <p className="font-body-sm text-body-sm opacity-70 mt-0.5 flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[15px] ${isDark ? 'text-primary' : 'text-primary'}`}>schedule</span> 
                    {cls.timeRange} • {cls.room}
                  </p>
                </div>
                {!isSubstitution && (
                  <div className="flex flex-col items-end">
                    <span className={`font-headline-sm text-headline-sm ${isFull ? 'text-error' : (isDark ? 'text-primary' : 'text-primary')}`}>
                      {cls.enrolled}<span className="font-body-sm text-body-sm opacity-70 font-normal">/{cls.maxCapacity}</span>
                    </span>
                    <span className={`font-label-caps text-label-caps font-bold flex items-center gap-1 ${isFull ? 'badge-full' : 'badge-available'}`}>
                      {isFull ? '🔴 100% — COMPLETO' : progressPercent >= 88 ? `🟠 ${Math.round(progressPercent)}% Cupo` : progressPercent >= 75 ? `🟡 ${Math.round(progressPercent)}% Cupo` : `🟢 ${Math.round(progressPercent)}% Cupo`}
                    </span>
                  </div>
                )}
              </div>
              
              {!isSubstitution && (
                <>
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className={`${isFull ? 'bg-error' : 'bg-primary'} h-full rounded-full transition-all`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  
                  {isFull ? (
                    <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                      <span className="font-body-sm text-body-sm opacity-70">{cls.waitlist} en lista de espera automática</span>
                      <span className="material-symbols-outlined text-[18px] opacity-70">group</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {Array.from({length: Math.min(cls.enrolled, 3)}).map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-transparent bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      <span className="font-label-md text-label-md opacity-70 pl-1">{cls.enrolled} inscritos listos</span>
                    </div>
                  )}

                  <div className={`pt-2 flex ${isFull ? 'items-center gap-2.5' : 'flex-col gap-2.5'}`}>
                    <Link 
                      href={`/profesor/clase/${cls.id}`} 
                      className={`${isFull ? 'flex-1 h-11' : 'w-full h-12'} premium-btn flex items-center justify-center gap-2`}
                    >
                      <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                      {isFull ? 'Pase QR' : 'Pase de Lista & Escanear QR'}
                    </Link>
                    <button 
                      className={`${isFull ? 'px-3 h-11' : 'w-full h-10'} rounded-xl bg-black/5 dark:bg-white/5 opacity-80 font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 active:bg-black/10 transition-colors`}
                      onClick={() => handleOpenCancelModal(cls.id)}
                    >
                      <span className="material-symbols-outlined text-[18px]">{isFull ? 'tune' : 'event_busy'}</span>
                      {isFull ? 'Aviso / Cancelar' : 'Cancelar o Solicitar Suplente'}
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>

      {nextClass ? (
        <section className="px-gutter-mobile mt-space-lg flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Siguiente Jornada ({new Date((nextClass as any).rawDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })})</h3>
            <span className="font-label-caps text-label-caps uppercase text-primary font-bold">Próxima</span>
          </div>
          <Link href={`/profesor/clase/${nextClass.id}`}>
            <article className="p-4 card-light flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex flex-col items-center justify-center">
                  <span className="font-label-caps text-label-caps uppercase opacity-80">{new Date((nextClass as any).rawDate).toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                  <span className="font-headline-sm text-headline-sm font-bold">{new Date((nextClass as any).rawDate).getDate()}</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="font-label-lg text-label-lg font-bold">{nextClass.name}</h4>
                  <span className="font-body-sm text-body-sm opacity-70">{nextClass.timeRange} ({nextClass.duration} min) • {nextClass.room}</span>
                  <span className="font-label-caps text-label-caps opacity-50 mt-0.5">Programada • {nextClass.enrolled}/{nextClass.maxCapacity} inscritos</span>
                </div>
              </div>
              <button className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] opacity-70">chevron_right</span>
              </button>
            </article>
          </Link>
        </section>
      ) : (
        <section className="px-gutter-mobile mt-space-lg flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Siguiente Jornada</h3>
          </div>
          <article className="p-6 rounded-xl bg-surface-container-low shadow-sm flex flex-col items-center justify-center text-center opacity-70">
            <span className="material-symbols-outlined text-[32px] text-secondary mb-2">event_available</span>
            <span className="font-label-md text-label-md text-secondary">No tienes clases futuras programadas aún.</span>
          </article>
        </section>
      )}

      <section className="px-gutter-mobile mt-space-lg">
        <div className="p-4 rounded-xl bg-primary-fixed text-on-primary-fixed shadow-md flex items-start gap-3 relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">flash_on</span>
          </div>
          <div className="flex flex-col">
            <h4 className="font-label-lg text-label-lg font-bold text-on-primary-fixed">Protocolo Ágil de Suplencia</h4>
            <p className="font-body-sm text-body-sm text-on-primary-fixed-variant mt-1 leading-relaxed">
              ¿No puedes impartir tu sesión? Solicita un suplente con un toque: el sistema notifica de inmediato a Secretaría y abre postulaciones a la red de docentes disponibles.
            </p>
          </div>
        </div>
      </section>

      {/* Cancel Modal */}
      {isCancelModalOpen && selectedClassId && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full bg-surface-container-lowest rounded-t-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-lg animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 rounded-full bg-surface-variant mx-auto mb-1"></div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Gestión Rápida de Ausencia</h3>
                <p className="font-body-sm text-body-sm text-secondary">{classes.find(c => c.id === selectedClassId)?.name}</p>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-normal">
              Al confirmar, se notificará a Coordinación y se enviará un anuncio automático a los alumnos inscritos informando la suspensión.
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-label-sm text-label-sm text-on-surface font-bold">Motivo de suspensión (Privado para Admin):</label>
              <textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Problemas de salud, retraso importante..."
                className="w-full bg-surface-container-high border border-surface-container-highest rounded-xl p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                rows={2}
              ></textarea>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button 
                className="w-full h-12 rounded-xl bg-error text-on-error font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                onClick={handleRequestSubstitution}
              >
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                Activar Relevo Inmediato
              </button>
              <button 
                className="w-full h-12 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg font-semibold flex items-center justify-center active:bg-surface-container transition-colors"
                onClick={() => { setIsCancelModalOpen(false); setSelectedClassId(null); }}
              >
                Volver a Mi Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
