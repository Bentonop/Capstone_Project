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
    <div className="flex flex-col w-full pb-20 min-h-screen bg-surface">
      <header className="pt-safe pb-2 px-margin-mobile flex flex-col justify-end sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-surface-container shadow-sm min-h-[70px]">
        <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">Métricas y Desempeño</h1>
      </header>

      <div className="flex flex-col animate-in fade-in">
        
        {/* Dashboard Superior Compacto */}
        <section className="px-margin-mobile pt-4 pb-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
               <span className="font-headline-md font-bold text-primary">{avgOccupancy}%</span>
               <span className="font-label-xs uppercase tracking-wider text-primary/80 mt-1">Ocupación</span>
            </div>
            <div className="bg-surface-container-low border border-surface-container p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
               <span className="font-headline-md font-bold text-on-surface">{totalClasses}</span>
               <span className="font-label-xs uppercase tracking-wider text-secondary mt-1">Clases</span>
            </div>
            <div className="bg-surface-container-low border border-surface-container p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
               <span className="font-headline-md font-bold text-on-surface">{totalStudents}</span>
               <span className="font-label-xs uppercase tracking-wider text-secondary mt-1">Alumnos</span>
            </div>
          </div>
        </section>

        {/* Historial de Clases */}
        <section className="flex flex-col mt-2">
          <div className="px-margin-mobile flex items-center justify-between pb-2">
            <h2 className="font-label-lg text-on-surface font-bold">Historial de Clases</h2>
            <span className="font-label-xs text-secondary bg-surface-container px-2 py-0.5 rounded-md">{pastClasses.length} completadas</span>
          </div>
          
          <div className="px-margin-mobile mb-3">
            <div className="bg-surface-container-lowest border border-surface-container rounded-lg p-2.5 flex items-start gap-2">
               <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">info</span>
               <p className="font-body-xs text-secondary leading-tight">
                 Toca una clase pasada para <strong className="text-on-surface">modificar su asistencia</strong> retroactivamente.
               </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-10">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
            </div>
          ) : pastClasses.length === 0 ? (
            <div className="mx-margin-mobile p-6 bg-surface-container-lowest border border-surface-container rounded-2xl flex flex-col items-center text-center shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-secondary mb-2">history</span>
              <h3 className="font-label-lg font-bold text-on-surface">No hay historial</h3>
              <p className="font-body-xs text-on-surface-variant mt-1">Aún no has impartido ninguna clase.</p>
            </div>
          ) : (
            <div className="flex flex-col bg-surface-container-lowest pb-10">
              {Object.entries(
                pastClasses.reduce((acc, cls) => {
                  if (!acc[cls.dateStr]) acc[cls.dateStr] = [];
                  acc[cls.dateStr].push(cls);
                  return acc;
                }, {} as Record<string, PastClass[]>)
              ).map(([dateStr, classesInDate]) => (
                <div key={dateStr} className="flex flex-col">
                  <div className="bg-surface-container-low/95 backdrop-blur-sm px-margin-mobile py-1.5 border-y border-surface-container sticky top-[70px] z-10">
                    <span className="font-label-xs text-primary uppercase font-bold tracking-wide">{dateStr}</span>
                  </div>
                  {classesInDate.map((cls, index) => (
                    <Link key={cls.id} href={`/profesor/clase/${cls.id}`}>
                      <article className={`px-margin-mobile py-3 flex items-center justify-between hover:bg-surface-container-low active:bg-surface-container transition-colors ${index !== classesInDate.length - 1 ? 'border-b border-surface-container-highest' : ''}`}>
                        <div className="flex flex-col">
                          <h3 className="font-label-lg text-on-surface font-bold leading-tight">{cls.name}</h3>
                          <div className="flex items-center gap-1.5 font-body-xs text-secondary mt-1">
                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">schedule</span>{cls.timeRange}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">meeting_room</span>{cls.room}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-center gap-1.5 pl-2">
                          <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${cls.enrolled >= cls.maxCapacity ? 'bg-error-container text-error' : 'bg-surface-container text-on-surface'}`}>
                            <span className="material-symbols-outlined text-[12px]">group</span>
                            <span className="font-label-sm font-bold">{cls.enrolled}/{cls.maxCapacity}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-secondary">chevron_right</span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
