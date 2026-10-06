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

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

export default function ProfesorMetricasPage() {
  const [allPastClasses, setAllPastClasses] = useState<PastClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      try {
        if (!supabase) return;
        
        const now = new Date();
        
        // Traer TODAS las clases pasadas
        const { data: clases, error } = await supabase
          .from("clase")
          .select("*")
          .lt("fecha_hora_fin", now.toISOString())
          .order("fecha_hora_inicio", { ascending: false });

        if (error) throw error;
        
        if (clases && clases.length > 0) {
          const mapped: PastClass[] = clases.map((c: any) => {
            const start = new Date(c.fecha_hora_inicio);
            const end = new Date(c.fecha_hora_fin);
            const duration = Math.round((end.getTime() - start.getTime()) / 60000);
            
            return {
              id: c.id_clase.toString(),
              name: c.nombre_clase,
              level: "Pole Sport", // Etiqueta mockeada según el diseño
              duration: duration || 75,
              timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
              room: c.sala || "Sala Pole 1",
              enrolled: c.cupos_inscritos || 0,
              maxCapacity: c.cupo_maximo || 8,
              dateStr: start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
              rawDate: start
            };
          });
          
          setAllPastClasses(mapped);
        }
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchHistory();
  }, []);

  // Calcular métricas para el MES ACTUAL
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthClasses = allPastClasses.filter(c => 
    c.rawDate.getMonth() === currentMonth && 
    c.rawDate.getFullYear() === currentYear
  );

  const totalClasses = monthClasses.length;
  const totalStudents = monthClasses.reduce((sum, c) => sum + c.enrolled, 0);
  const totalCapacity = monthClasses.reduce((sum, c) => sum + c.maxCapacity, 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  // Filtrar clases por el DÍA SELECCIONADO
  const dayClasses = allPastClasses.filter(c => 
    c.rawDate.toDateString() === selectedDate.toDateString()
  );

  // Lógica de Calendario Semanal
  const getWeekDays = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    return Array.from({length: 7}).map((_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(selectedDate);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-margin-mobile pt-safe mt-4 mb-5">
        <h1 className="font-headline-sm font-bold text-on-surface">Métricas y Desempeño</h1>
        <span className="font-label-xs bg-[#FFFDF5] border border-[#FBEFA3] text-[#D4AF37] px-3 py-1 rounded-full font-bold shadow-sm">Mes en curso</span>
      </div>

      {/* Metrics Row */}
      <div className="flex px-margin-mobile gap-3 mb-8 animate-in fade-in">
        {/* Ocupacion Card */}
        <div className="flex-1 bg-[#FFFDF5] border border-[#FBEFA3] rounded-2xl flex flex-col items-center justify-center py-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-1 right-2 opacity-30">
             <span className="material-symbols-outlined text-[#D4AF37] text-[24px]">monitoring</span>
          </div>
          <span className="font-headline-lg font-bold text-[#D4AF37] leading-none mb-1.5">{avgOccupancy}%</span>
          <span className="font-label-xs uppercase tracking-wider text-[#D4AF37] font-bold">Ocupación</span>
        </div>

        {/* Classes Card */}
        <div className="flex-1 bg-surface-container-lowest border border-surface-container rounded-2xl flex flex-col items-center justify-center py-4 shadow-sm">
          <span className="font-headline-lg font-bold text-on-surface leading-none mb-1.5">{totalClasses}</span>
          <span className="font-label-xs uppercase tracking-wider text-secondary font-bold">Clases</span>
        </div>

        {/* Students Card */}
        <div className="flex-1 bg-surface-container-lowest border border-surface-container rounded-2xl flex flex-col items-center justify-center py-4 shadow-sm">
          <span className="font-headline-lg font-bold text-on-surface leading-none mb-1.5">{totalStudents}</span>
          <span className="font-label-xs uppercase tracking-wider text-secondary font-bold">Alumnos</span>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="px-margin-mobile mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm font-bold text-on-surface capitalize">
              {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <span className="font-label-xs bg-surface-container px-2.5 py-1 rounded-md text-secondary font-bold">
              Semana {getWeekNumber(selectedDate)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-secondary">
            <span className="material-symbols-outlined text-[20px] cursor-pointer active:text-on-surface" onClick={() => navigateWeek(-1)}>chevron_left</span>
            <span className="font-label-sm font-bold cursor-pointer active:text-on-surface" onClick={() => setSelectedDate(new Date())}>Hoy</span>
            <span className="material-symbols-outlined text-[20px] cursor-pointer active:text-on-surface" onClick={() => navigateWeek(1)}>chevron_right</span>
          </div>
        </div>

        <div className="flex justify-between">
          {weekDays.map((d, i) => {
             const isSelected = d.toDateString() === selectedDate.toDateString();
             const isFuture = d > new Date();
             return (
               <div 
                 key={i} 
                 onClick={() => !isFuture && setSelectedDate(d)}
                 className={`flex flex-col items-center justify-center w-[46px] py-2.5 rounded-2xl transition-all ${isSelected ? 'bg-[#1A1A1A] text-white shadow-md' : 'bg-transparent text-secondary'} ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95 hover:bg-surface-container-lowest'}`}
               >
                 <span className={`font-label-xs uppercase tracking-wide ${isSelected ? 'text-white/80' : ''}`}>
                   {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                 </span>
                 <span className={`font-headline-sm mt-1 ${isSelected ? 'text-white font-bold' : 'text-on-surface font-bold'}`}>
                   {d.getDate().toString().padStart(2, '0')}
                 </span>
                 {/* Dot indicator */}
                 <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSelected ? 'bg-[#D4AF37]' : (d.toDateString() === new Date().toDateString() ? 'bg-primary' : 'bg-transparent')}`}></div>
               </div>
             )
          })}
        </div>
      </div>

      {/* Notice Alert */}
      <div className="px-margin-mobile mb-6">
        <div className="bg-[#FFFDF5] border border-[#FBEFA3] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-[#D4AF37]">info</span>
          <p className="font-body-sm text-on-surface-variant leading-snug">
            Toca una clase pasada para <strong className="text-on-surface font-semibold">modificar su asistencia</strong> retroactivamente.
          </p>
        </div>
      </div>

      {/* Classes Section Header */}
      <div className="px-margin-mobile mb-4 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-label-sm text-[#D4AF37] uppercase font-bold tracking-wider">
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <span className="font-body-sm text-secondary">{dayClasses.length} sesiones asignadas</span>
        </div>
        <span className="font-label-xs bg-surface-container px-3 py-1.5 rounded-full text-secondary font-bold">
          {dayClasses.filter(c => c.rawDate < new Date()).length} completadas
        </span>
      </div>

      {/* Class Cards */}
      <div className="px-margin-mobile flex flex-col gap-3 pb-8">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
          </div>
        ) : dayClasses.length === 0 ? (
          <div className="py-10 bg-surface-container-lowest border border-surface-container rounded-3xl flex flex-col items-center text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-surface-variant mb-3">event_busy</span>
            <h3 className="font-headline-sm font-bold text-on-surface">Sin clases</h3>
            <p className="font-body-sm text-secondary mt-1">No hay historial de clases para este día.</p>
          </div>
        ) : (
          dayClasses.map(cls => (
            <Link key={cls.id} href={`/profesor/clase/${cls.id}`}>
              <article className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 flex items-center justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-[#D4AF37]/40 transition-all active:scale-[0.98]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-headline-sm font-bold text-on-surface">{cls.name}</h4>
                    <span className="font-label-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-md font-bold">{cls.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-body-sm text-secondary">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>{cls.timeRange}</span>
                    <span className="px-1 text-surface-variant">•</span>
                    <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                    <span>{cls.room}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-surface-container-low px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-on-surface font-bold font-label-md border border-surface-container">
                    <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                    {cls.enrolled}/{cls.maxCapacity}
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-surface-variant">chevron_right</span>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
