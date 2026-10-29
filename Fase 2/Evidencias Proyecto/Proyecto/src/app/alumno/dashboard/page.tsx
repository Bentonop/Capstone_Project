"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AlumnoDashboard() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        if (!supabase) throw new Error("Supabase client is null");
        
        // Fetch class types first
        const { data: typesData, error: typesError } = await supabase
          .from("tipos_clase")
          .select("*")
          .order("created_at", { ascending: true });
          
        if (typesError) throw typesError;

        // Fetch templates
        const { data, error } = await supabase
          .from("plantillas_clase")
          .select("*")
          .order("dia_semana", { ascending: true })
          .order("hora_inicio", { ascending: true });

        if (error) throw error;

        // Group by class name
        const classGroups: Record<string, any> = {};
        
        // Initialize with fetched programs
        if (typesData) {
          typesData.forEach(bp => {
            classGroups[bp.nombre] = {
              id: bp.id || bp.nombre,
              name: bp.nombre,
              icon: bp.icono || "sports_martial_arts",
              schedulesMap: {} // day -> times array
            };
          });
        }

        // Add dynamically found classes that might not be in tipos_clase
        if (data) {
          data.forEach(c => {
            if (!classGroups[c.nombre_clase]) {
              return; // Skip if not in tipos_clase
            }
            
            const days = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
            const dayName = days[c.dia_semana];
            
            const formatTime = (timeString: string) => {
              if (!timeString) return "";
              const parts = timeString.split(':');
              let h = parseInt(parts[0]);
              const m = parts[1];
              const ampm = h >= 12 ? 'pm' : 'am';
              h = h % 12;
              h = h ? h : 12; 
              return `${h}:${m}${ampm}`;
            };
            
            const timeStr = `${formatTime(c.hora_inicio)} - ${formatTime(c.hora_fin)}`;
            
            if (!classGroups[c.nombre_clase].schedulesMap[dayName]) {
              classGroups[c.nombre_clase].schedulesMap[dayName] = [];
            }
            
            // Avoid duplicate times for the same day
            if (!classGroups[c.nombre_clase].schedulesMap[dayName].includes(timeStr)) {
              classGroups[c.nombre_clase].schedulesMap[dayName].push(timeStr);
            }
          });
        }

        // Convert schedulesMap to the array format for rendering
        const daysOrder = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
        
        const formattedPrograms = Object.values(classGroups).map(pg => {
          const schedules: any[] = [];
          
          daysOrder.forEach(day => {
            if (pg.schedulesMap[day] && pg.schedulesMap[day].length > 0) {
              // Sort times (basic string sort works for AM/PM if they are zero padded correctly, but this is simple enough)
              schedules.push({
                day: day,
                times: pg.schedulesMap[day]
              });
            } else {
              schedules.push({
                day: day,
                times: []
              });
            }
          });
          
          return {
            ...pg,
            schedules
          };
        });

        setPrograms(formattedPrograms);
      } catch (error) {
        console.error("Error fetching dashboard classes:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClasses();
  }, []);

  return (
    <div className="flex flex-col w-full pb-bottom-nav-safe">
      <div className="flex flex-col px-margin-mobile gap-space-lg pt-space-sm">
        
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary text-[28px]">library_books</span>
          <h1 className="font-headline-md text-[24px] text-on-surface font-bold">Nuestros programas</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-2xl border border-surface-container mt-4 text-center">
            <span className="material-symbols-outlined text-secondary text-4xl mb-3">inventory_2</span>
            <h3 className="font-headline-sm text-on-surface">No hay programas disponibles</h3>
            <p className="font-body-sm text-on-surface-variant mt-2">Próximamente se publicarán nuevas disciplinas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-space-lg">
            {programs.map((program) => (
              <article key={program.id} className="flex flex-col bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 p-space-md border-b border-surface-container/50">
                  <span className="material-symbols-outlined text-primary">{program.icon}</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">{program.name}</h2>
                </div>
                
                <div className="p-space-md pt-space-lg">
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                    {program.schedules.map((schedule: any, idx: number) => (
                      <div key={idx} className="flex flex-col min-w-[120px] flex-shrink-0">
                        <span className="font-label-caps text-[10px] text-on-surface-variant text-center font-bold tracking-wider mb-2 uppercase">
                          {schedule.day}
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {schedule.times.length > 0 ? (
                            schedule.times.map((time: string, tIdx: number) => {
                              const [start, end] = time.split(" - ");
                              return (
                                <div key={tIdx} className="flex flex-col items-center justify-center py-2 px-1 bg-surface-container rounded-lg border-l-2 border-l-primary text-center">
                                  <span className="font-label-md text-[13px] text-primary font-medium">{start}</span>
                                  <span className="font-label-sm text-[11px] text-on-surface-variant">- {end}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center justify-center py-2 text-transparent select-none">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
