"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

export default function MisClasesPage() {
  const [activeTab, setActiveTab] = useState("hoy");
  const [reservas, setReservas] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Nuevo estado para el modal del Pase QR
  const [selectedReserva, setSelectedReserva] = useState<any | null>(null);

  useEffect(() => {
    async function fetchMyClasses() {
      if (!supabase) return;
      
      const { data: user } = await supabase.from("profiles").select("id").eq("role", "alumno").order("created_at", { ascending: true }).limit(1).single();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data: subs } = await supabase
        .from("user_suscripciones")
        .select("creditos_restantes")
        .eq("user_id", user.id)
        .eq("estado", "activa")
        .gt("creditos_restantes", 0);
        
      if (subs) {
         const totalCredits = subs.reduce((sum, sub) => sum + sub.creditos_restantes, 0);
         setCredits(totalCredits);
      }

      // Fetch reservations with class details
      const { data, error } = await supabase
        .from('reserva')
        .select(`
           *,
           clase (
              *,
              profiles:id_profesor (name)
           )
        `)
        .eq("id_usuario", user.id)
        .order("fecha_operacion", { ascending: false });
        
      if (!error && data) {
        // filter out invalid
        const validData = data.filter(r => r.clase);
        setReservas(validData);
      }
      setIsLoading(false);
    }
    fetchMyClasses();
  }, []);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const pasadas = reservas.filter(r => new Date(r.clase.fecha_hora_fin) < startOfToday).reverse();
  const hoy = reservas.filter(r => {
    const start = new Date(r.clase.fecha_hora_inicio);
    return start >= startOfToday && start <= endOfToday;
  });
  const futuras = reservas.filter(r => new Date(r.clase.fecha_hora_inicio) > endOfToday);
  
  let displayedReservas: any[] = [];
  if (activeTab === "pasadas") displayedReservas = pasadas;
  if (activeTab === "hoy") displayedReservas = hoy;
  if (activeTab === "futuras") displayedReservas = futuras;

  return (
    <div className="flex flex-col w-full pb-bottom-nav-safe">

      {/* Main Content */}
      <div className="flex flex-col px-margin-mobile gap-space-lg pt-space-sm">
        
        {/* Tu Ritmo Activo */}
        <section className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-[11px] text-primary font-bold uppercase tracking-wider mb-1">TU RITMO ACTIVO</span>
            <h1 className="font-headline-md text-[24px] text-on-surface font-bold leading-none">{reservas.length} Clases Reservadas</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-[18px]">local_activity</span>
            <span className="font-label-md text-label-md text-on-surface font-bold">{credits} créditos</span>
          </div>
        </section>

        {/* Tabs - Underline Style */}
        <section className="flex items-center border-b border-surface-container">
          <button 
            onClick={() => setActiveTab("pasadas")}
            className={`flex-1 flex items-center justify-center gap-1.5 pb-3 pt-2 font-label-md text-label-md transition-all border-b-2 ${
              activeTab === "pasadas" ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pasadas <span className="text-[13px]">{pasadas.length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("hoy")}
            className={`flex-1 flex items-center justify-center gap-1.5 pb-3 pt-2 font-label-md text-label-md transition-all border-b-2 ${
              activeTab === "hoy" ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Hoy <span className="text-[13px]">{hoy.length}</span>
          </button>

          <button 
            onClick={() => setActiveTab("futuras")}
            className={`flex-1 flex items-center justify-center gap-1.5 pb-3 pt-2 font-label-md text-label-md transition-all border-b-2 ${
              activeTab === "futuras" ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Futuras <span className="text-[13px]">{futuras.length}</span>
          </button>
        </section>

        {/* Cancelación Consciente Policy */}
        <section className="flex items-start gap-3 bg-surface-container-lowest p-space-md rounded-2xl border border-surface-container shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">rule</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface font-bold">Cancelación Consciente <span className="text-primary">•</span></span>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed mt-1">
              Recuerda: Si liberas tu cupo con al menos <strong className="text-on-surface">2 hrs de anticipación</strong>, tu crédito vuelve automáticamente a tu saldo mensual sin llamadas ni esperas.
            </p>
          </div>
        </section>

        {/* Classes List */}
        <div className="flex flex-col gap-space-md pb-space-xl">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
            </div>
          ) : displayedReservas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-2xl border border-surface-container mt-4 text-center">
              <span className="material-symbols-outlined text-secondary text-4xl mb-3">calendar_month</span>
              <h3 className="font-headline-sm text-on-surface">No hay clases en esta sección</h3>
            </div>
          ) : displayedReservas.map((cls) => {
            const startDate = new Date(cls.clase.fecha_hora_inicio);
            const endDate = new Date(cls.clase.fecha_hora_fin);
            const durationMs = endDate.getTime() - startDate.getTime();
            const durationMins = Math.round(durationMs / 60000);
            
            const isToday = startDate.toDateString() === now.toDateString();
            
            const days = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
            const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
            const dateStr = isToday ? "HOY" : `${days[startDate.getDay()]} ${startDate.getDate()} ${months[startDate.getMonth()]}`;
            
            let h = startDate.getHours();
            const m = startDate.getMinutes().toString().padStart(2, '0');
            h = h % 12;
            h = h ? h : 12; 
            const timeStr = `${h}:${m}`;
            
            let profName = "Profesor";
            if (cls.clase.profiles) {
               profName = Array.isArray(cls.clase.profiles) ? cls.clase.profiles[0]?.name : cls.clase.profiles.name;
            }

            return (
              <article key={cls.id_reserva} className="flex flex-col bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden shadow-md">
                {/* Header info */}
                <div className="flex items-center justify-between p-space-md border-b border-surface-container/50">
                  <div className="flex items-center gap-2">
                    <span className={`font-label-caps text-[11px] font-bold tracking-widest uppercase ${isToday ? 'text-primary' : 'text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full'}`}>
                      {isToday && <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mr-1.5 align-middle"></span>}
                      {dateStr}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">{timeStr} hrs</span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant ml-1">- {durationMins} min</span>
                  </div>
                  <span className="px-2.5 py-1 bg-surface-container rounded-full font-label-md text-[11px] text-on-surface font-medium border border-surface-container-high">
                    Confirmada
                  </span>
                </div>

                {/* Class info */}
                <div className="flex gap-space-md p-space-md">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-high flex-shrink-0 border border-surface-container overflow-hidden">
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-headline-sm text-[18px] text-on-surface font-bold mb-1 leading-tight">{cls.clase.nombre_clase}</h3>
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span className="font-body-sm text-[13px]">{profName} <span className="mx-1">•</span> {cls.clase.sala || "Sala Principal"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {(isToday || activeTab === 'futuras') && (
                  <div className="flex gap-2 p-space-md pt-0">
                    {isToday ? (
                      <button 
                        onClick={() => setSelectedReserva(cls)}
                        className="flex-1 h-14 bg-primary text-on-primary rounded-xl font-label-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                        Check-in QR
                      </button>
                    ) : (
                      <button className="flex-1 h-14 bg-surface-container-high text-on-surface rounded-xl font-label-lg font-medium flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all">
                        <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
                        Reagendar
                      </button>
                    )}
                    <button className={`${isToday ? 'w-[120px]' : 'flex-1'} h-14 bg-surface-container-high text-on-surface rounded-xl font-label-lg font-medium flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all`}>
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Cancelar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal Pase de Entrada QR */}
      {selectedReserva && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-surface-container flex flex-col items-center">
            
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
            </div>

            <h2 className="font-headline-sm text-[20px] text-on-surface font-bold">Pase de Ingreso</h2>
            <p className="font-body-sm text-[13px] text-on-surface-variant mb-5 mt-1">
              Muestra este código al profesor para confirmar tu asistencia a <strong className="text-on-surface">{selectedReserva.clase.nombre_clase}</strong>.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-surface-container shadow-inner flex justify-center items-center">
              <QRCodeSVG 
                value={JSON.stringify({
                  id_reserva: selectedReserva.id_reserva,
                  id_clase: selectedReserva.clase.id_clase
                })} 
                size={210} 
                level="H" 
                includeMargin={true} 
              />
            </div>

            <button
              onClick={() => setSelectedReserva(null)}
              className="mt-6 w-full py-3.5 bg-surface-container-high text-on-surface font-label-lg font-bold rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}

    </div>
  );
}