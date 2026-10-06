"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface PastClass {
  id: string;
  name: string;
  level: string;
  duration: number;
  timeRange: string;
  room: string;
  enrolled: number;
  maxCapacity: number;
  dateStr: string;
  rawDate: Date;
}

export default function ProfesorMetricasPage() {
  const [pastClasses, setPastClasses] = useState<PastClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Metricas
  const [totalClasses, setTotalClasses] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      try {
        if (!supabase) return;
        
        const now = new Date();
        
        // Traer clases pasadas
        // Nota: En producción, deberíamos filtrar por id_profesor, 
        // pero actualmente en el prototipo vemos todas las clases pasadas.
        const { data: clases, error } = await supabase
          .from("clase")
          .select("*")
          .lt("fecha_hora_fin", now.toISOString())
          .order("fecha_hora_inicio", { ascending: false });

        if (error) throw error;
        
        if (clases && clases.length > 0) {
          let totalEnrolled = 0;
          let totalCapacity = 0;
          
          const mapped: PastClass[] = clases.map((c: any) => {
            const start = new Date(c.fecha_hora_inicio);
            const end = new Date(c.fecha_hora_fin);
            const duration = Math.round((end.getTime() - start.getTime()) / 60000);
            
            totalEnrolled += (c.cupos_inscritos || 0);
            totalCapacity += (c.cupo_maximo || 8);
            
            return {
              id: c.id_clase.toString(),
              name: c.nombre_clase,
              level: "Multinivel",
              duration: duration || 75,
              timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
              room: c.sala || "Sala Principal",
              enrolled: c.cupos_inscritos || 0,
              maxCapacity: c.cupo_maximo || 8,
              dateStr: start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
              rawDate: start
            };
          });
          
          setPastClasses(mapped);
          setTotalClasses(mapped.length);
          setTotalStudents(totalEnrolled);
          setAvgOccupancy(totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0);
        }

      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col w-full pb-10 min-h-screen bg-surface">
      <header className="pt-safe pb-4 px-margin-mobile flex flex-col justify-end sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-surface-container shadow-sm min-h-[90px]">
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Métricas y Desempeño</h1>
      </header>

      <div className="px-margin-mobile pt-space-md flex flex-col gap-6 animate-in fade-in">
        
        {/* Mini Dashboard Superior */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex flex-col gap-1 items-center justify-center text-center shadow-sm">
             <span className="material-symbols-outlined text-primary text-[28px]">monitoring</span>
             <span className="font-display-md font-bold text-primary">{avgOccupancy}%</span>
             <span className="font-label-sm uppercase tracking-wider text-primary/80">Ocupación Media</span>
          </div>
          
          <div className="flex flex-col gap-3">
             <div className="bg-surface-container-low border border-surface-container shadow-sm p-3 rounded-2xl flex flex-col items-center justify-center flex-1">
                <span className="font-headline-sm font-bold text-on-surface">{totalClasses}</span>
                <span className="font-label-xs uppercase tracking-wider text-secondary">Clases Dadas</span>
             </div>
             <div className="bg-surface-container-low border border-surface-container shadow-sm p-3 rounded-2xl flex flex-col items-center justify-center flex-1">
                <span className="font-headline-sm font-bold text-on-surface">{totalStudents}</span>
                <span className="font-label-xs uppercase tracking-wider text-secondary">Alumnos Atendidos</span>
             </div>
          </div>
        </section>

        {/* Historial de Clases */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-2">
            <h2 className="font-headline-sm text-on-surface font-bold">Historial de Clases</h2>
            <span className="font-label-sm text-secondary bg-surface-container px-2 py-1 rounded-md">{pastClasses.length} completadas</span>
          </div>
          
          <div className="bg-surface-container-low border border-surface-container rounded-xl p-3 flex items-start gap-3 shadow-sm">
             <span className="material-symbols-outlined text-secondary mt-0.5">info</span>
             <p className="font-body-sm text-secondary leading-relaxed">
               Si un alumno llegó tarde y no alcanzaste a escanear su código, selecciona la clase en este historial para <strong className="text-on-surface">modificar el pase de lista</strong>.
             </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-10">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
            </div>
          ) : pastClasses.length === 0 ? (
            <div className="p-8 bg-surface-container-lowest border border-surface-container rounded-2xl flex flex-col items-center text-center shadow-sm">
              <span className="material-symbols-outlined text-[48px] text-secondary mb-3">history</span>
              <h3 className="font-headline-sm text-on-surface">No hay historial</h3>
              <p className="font-body-sm text-on-surface-variant mt-1">Aún no has impartido ninguna clase que haya finalizado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pastClasses.map(cls => (
                <Link key={cls.id} href={`/profesor/clase/${cls.id}`}>
                  <article className="p-4 bg-surface-container-lowest border border-surface-container rounded-2xl flex flex-col gap-2 shadow-sm hover:border-primary/40 transition-colors active:scale-95">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-primary uppercase font-bold capitalize">{cls.dateStr}</span>
                        <h3 className="font-headline-sm text-on-surface mt-0.5">{cls.name}</h3>
                      </div>
                      <div className="bg-surface-container px-2 py-1 rounded-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-secondary">group</span>
                        <span className="font-label-sm font-bold text-on-surface">{cls.enrolled}/{cls.maxCapacity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-secondary font-body-sm mt-1">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {cls.timeRange}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                        {cls.room}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
