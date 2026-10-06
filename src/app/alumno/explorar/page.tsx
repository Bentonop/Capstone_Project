"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ClassSession {
  id: string;
  name: string;
  level: string;
  duration: number;
  timeRange: string;
  room: string;
  enrolled: number;
  maxCapacity: number;
  instructor: string;
  instructorId?: string;
  status: string;
  rawDate: string;
}

const FALLBACK_CLASSES: ClassSession[] = [
  {
    id: "demo-1",
    name: "Urbano & Commercial Dance",
    level: "Intermedio",
    duration: 75,
    timeRange: "17:00 - 18:15",
    room: "Sala Principal",
    enrolled: 5,
    maxCapacity: 8,
    instructor: "Camila Rivas",
    status: "programada",
    rawDate: new Date().toISOString()
  },
  {
    id: "demo-2",
    name: "Pole Dance – Principiantes",
    level: "Nivel 0 / Básico",
    duration: 75,
    timeRange: "18:30 - 19:45",
    room: "Sala 3",
    enrolled: 0,
    maxCapacity: 8,
    instructor: "Carlos 'Che' Vega",
    status: "programada",
    rawDate: new Date().toISOString()
  }
];
const MOCK_AGENDA = [
  {
    id: "1", status: "pasada", date: "Mar. 18 ago", time: "7:15pm - 8:00pm",
    title: "Pole Dance Básico", bookedBy: "Business", bookedAt: "jue. 6 ago @ 1:41pm",
    attendance: "no confirmada", code: "p0MkGyo7L8"
  },
  {
    id: "2", status: "pasada", date: "Jue. 13 ago", time: "7:15pm - 8:00pm",
    title: "Elongación Flex", bookedBy: "Business", bookedAt: "jue. 6 ago @ 1:41pm",
    attendance: "confirmada", code: "XD96nke6L2"
  },
  {
    id: "3", status: "pasada", date: "Mar. 11 ago", time: "7:15pm - 8:00pm",
    title: "Pole Dance Básico", bookedBy: "Business", bookedAt: "jue. 6 ago @ 1:40pm",
    attendance: "no confirmada", code: "bDWj6Bqk0R"
  }
];

function ExplorarContent() {
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filtro') || "all");
  const [activeInstructor, setActiveInstructor] = useState("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [activeDay, setActiveDay] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reservation Modal State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedClassToBook, setSelectedClassToBook] = useState<ClassSession | null>(null);
  
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [misReservas, setMisReservas] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const [currentWeek, setCurrentWeek] = useState<any[]>([]);
  const [weekHeader, setWeekHeader] = useState("Cargando...");
  const [weekOffset, setWeekOffset] = useState(0);

  const uniqueClassNames = Array.from(new Set(classes.map(c => c.name)));
  const uniqueInstructors = Array.from(new Set(classes.map(c => c.instructor).filter(Boolean)));
  
  const filters = [
    { id: "all", label: "Todas" },
    ...uniqueClassNames.map(name => ({ id: name, label: name }))
  ];

  useEffect(() => {
    // Generate next 15 days starting from today
    const today = new Date();
    const upcomingDays = [];
    const dayNames = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
    const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    
    for (let i = 0; i < 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      upcomingDays.push({
        day: d.getDate().toString(),
        label: dayNames[d.getDay()],
        fullDate: d,
        dateStr: d.toISOString().split('T')[0],
        month: monthNames[d.getMonth()]
      });
    }
    
    setCurrentWeek(upcomingDays);
    setActiveDay(today.getDate().toString());
    setWeekHeader(`${monthNames[today.getMonth()]} ${today.getFullYear().toString().substring(2)}`);
  }, []);

  useEffect(() => {
    async function fetchAvailableClasses() {
      try {
        if (!supabase) throw new Error("Supabase client is null");
        
        const { data, error } = await supabase
          .from("clase")
          .select(`
            *,
            profiles:id_profesor (name)
          `)
          .eq("estado_clase", "programada")
          .order("fecha_hora_inicio", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedClasses: ClassSession[] = data.map((c: any) => {
            const start = new Date(c.fecha_hora_inicio);
            const end = new Date(c.fecha_hora_fin);
            const duration = Math.round((end.getTime() - start.getTime()) / 60000);
            
            let profName = "Profesor";
            if (c.profiles) {
              profName = Array.isArray(c.profiles) ? c.profiles[0]?.name : c.profiles?.name;
            }
            
            return {
              id: c.id_clase.toString(),
              name: c.nombre_clase,
              level: "Multinivel", // Placeholder till DB supports level
              duration: duration || 75,
              timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
              room: c.sala || "Sala Principal",
              enrolled: c.cupos_inscritos || 0,
              maxCapacity: c.cupo_maximo || 8,
              instructor: profName,
              instructorId: c.id_profesor,
              status: c.estado_clase,
              rawDate: c.fecha_hora_inicio
            };
          });
          setClasses(mappedClasses);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchActiveSubscription() {
      try {
        if (!supabase) return;
        const { data: user } = await supabase.from("profiles").select("id").eq("role", "alumno").order("created_at", { ascending: true }).limit(1).single();
        if (user) {
          const { data: sub } = await supabase
            .from("user_suscripciones")
            .select("*, planes(nombre_plan)")
            .eq("user_id", user.id)
            .eq("estado", "activa")
            .gt("creditos_restantes", 0)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (sub) setActiveSubscription(sub);
        }
      } catch (err) {
        console.error("Error fetching subscription", err);
      }
    }

    async function fetchUserReservations() {
      try {
        if (!supabase) return;
        const { data: user } = await supabase.from("profiles").select("id").eq("role", "alumno").order("created_at", { ascending: true }).limit(1).single();
        if (user) {
          const { data: reservas } = await supabase.from("reserva").select("id_clase").eq("id_usuario", user.id).eq("estado_reserva", "confirmada");
          if (reservas) {
             setMisReservas(reservas.map((r: any) => r.id_clase.toString()));
          }
        }
      } catch (err) {
        console.error("Error fetching user reservations", err);
      }
    }

    fetchAvailableClasses();
    fetchActiveSubscription();
    fetchUserReservations();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReservar = (classId: string, currentEnrolled: number, maxCap: number) => {
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      if (currentEnrolled >= maxCap) {
        showToast("Esta clase ya está llena");
        return;
      }
      if (misReservas.includes(classId)) {
        showToast("Ya has reservado esta clase");
        return;
      }
      setSelectedClassToBook(cls);
      setIsReservationModalOpen(true);
    }
  };

  const handleConfirmBook = async () => {
    if (!selectedClassToBook || !activeSubscription) return;
    setIsBooking(true);
    try {
       if (!supabase) return;
       // 1. Insert into reserva
       const { error: reserveError } = await supabase.from("reserva").insert({
         id_usuario: activeSubscription.user_id,
         id_clase: parseInt(selectedClassToBook.id),
         estado_reserva: 'confirmada',
         fecha_operacion: new Date().toISOString()
       });
       if (reserveError) throw reserveError;

       // 2. Increment enrolled count in clase
       const newEnrolled = selectedClassToBook.enrolled + 1;
       const { error: clError } = await supabase.from("clase").update({
         cupos_inscritos: newEnrolled
       }).eq("id_clase", parseInt(selectedClassToBook.id));
       if (clError) throw clError;

       // 3. Deduct credit
       const { error: updateError } = await supabase.from("user_suscripciones").update({
         creditos_restantes: activeSubscription.creditos_restantes - 1
       }).eq("id", activeSubscription.id);
       if (updateError) throw updateError;
       
       // Update local state
       setActiveSubscription({...activeSubscription, creditos_restantes: activeSubscription.creditos_restantes - 1});
       setMisReservas([...misReservas, selectedClassToBook.id]);
       setClasses(classes.map(c => c.id === selectedClassToBook.id ? {...c, enrolled: newEnrolled} : c));
       
       setIsReservationModalOpen(false);
       showToast("Reserva confirmada con éxito");
       
    } catch(err) {
       console.error("Error booking", err);
       alert("Error al confirmar la reserva");
    } finally {
       setIsBooking(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-bottom-nav-safe">
      {/* Top Header */}
      <div className="flex items-center justify-between px-margin-mobile pt-space-md pb-space-sm">
        <h1 className="font-headline-md text-[24px] text-on-surface font-bold">Sesiones</h1>
      </div>
      {/* Search & Sticky Filter Area */}
      <section className="flex flex-col px-margin-mobile gap-space-sm">
        <div className="relative flex items-center w-full bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container transition-all focus-within:border-primary">
          <span className="material-symbols-outlined text-outline ml-space-md text-[22px] select-none text-on-surface-variant">search</span>
          <input 
            className="w-full h-[52px] pl-space-xs pr-space-md bg-transparent text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant focus:outline-none" 
            id="class-search-input" 
            placeholder="Buscar disciplina, estilo o profesor" 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            aria-label="Filtros avanzados" 
            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
            className={`mr-space-xs w-9 h-9 flex items-center justify-center rounded-lg transition-colors z-50 relative ${isFilterModalOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
          
          {/* Dropdown Popover */}
          {isFilterModalOpen && (
            <>
              {/* Invisible overlay to close dropdown */}
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterModalOpen(false)}></div>
              
              <div className="absolute top-[50px] right-0 w-[240px] bg-surface border border-surface-container shadow-lg rounded-xl p-3 z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 origin-top-right">
                
                {/* Filter by Instructor */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Profesor</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button 
                      onClick={() => setActiveInstructor("all")}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${activeInstructor === "all" ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container-high'}`}
                    >
                      Todos
                    </button>
                    {uniqueInstructors.map(inst => (
                      <button 
                        key={inst}
                        onClick={() => setActiveInstructor(inst)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${activeInstructor === inst ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container-high'}`}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter by Class */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Disciplina</span>
                  <div className="flex flex-wrap gap-1">
                    <button 
                      onClick={() => setActiveFilter("all")}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${activeFilter === "all" ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container-high'}`}
                    >
                      Todas
                    </button>
                    {uniqueClassNames.map(cls => (
                      <button 
                        key={cls}
                        onClick={() => setActiveFilter(cls)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${activeFilter === cls ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container-high'}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-surface-container">
                   <button 
                     onClick={() => {
                       setActiveInstructor("all");
                       setActiveFilter("all");
                       setSearchQuery("");
                     }}
                     className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
                   >
                     Limpiar todo
                   </button>
                   <button 
                     onClick={() => setIsFilterModalOpen(false)}
                     className="text-[11px] font-semibold text-primary transition-colors"
                   >
                     Cerrar
                   </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Disciplina Pills */}
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-space-2xs -mx-margin-mobile px-margin-mobile snap-x scroll-smooth">
          {filters.map((f) => (
            <button 
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`filter-pill snap-start whitespace-nowrap px-space-md h-9 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all active:scale-95 ${
                activeFilter === f.id 
                  ? "bg-primary text-on-primary shadow-sm" 
                  : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high border border-surface-container"
              }`}
            >
              {activeFilter === f.id && <span className="material-symbols-outlined text-[16px]">done</span>}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Interactive Weekly Calendar Strip */}
      <section className="flex flex-col mt-space-md py-space-sm bg-surface">
        <div className="flex items-center gap-2 pl-margin-mobile overflow-x-auto no-scrollbar pr-margin-mobile py-1 snap-x" id="calendar-days-rail">
          
          <div className="flex flex-col items-center justify-center pr-4 border-r border-surface-container snap-start flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center mb-1">
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <span className="font-label-sm text-[10px] text-on-surface font-bold uppercase tracking-widest">{weekHeader.substring(0, 3)} {weekHeader.slice(-2)}</span>
          </div>

          <div className="flex items-center gap-3 pl-3 flex-nowrap">
            {currentWeek.map((d) => {
              const isActive = activeDay === d.day;
              return (
                <button 
                  key={d.dateStr}
                  onClick={() => setActiveDay(d.day)}
                  className={`cal-day snap-start flex-shrink-0 w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-[1.5px] ${
                    isActive 
                      ? "border-primary bg-surface-container shadow-sm" 
                      : "border-surface-container bg-surface-container-lowest text-on-surface-variant hover:border-outline"
                  }`}
                >
                  <span className={`font-label-caps text-[9px] uppercase ${isActive ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {d.label}.
                  </span>
                  <span className={`font-headline-sm text-[15px] leading-none ${isActive ? "text-on-surface font-extrabold" : "text-on-surface"}`}>
                    {d.day}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center px-margin-mobile mt-3 gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">filter_alt</span>
          <span className="font-body-md text-body-md font-medium">Mostrando todo</span>
        </div>
      </section>

      {/* Content Head & Meta Badge */}
      <div className="flex items-center justify-between px-margin-mobile mt-space-md mb-space-xs">
        <div className="flex items-baseline gap-2">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold uppercase">
            {currentWeek.find(d => d.day === activeDay)?.label || ""}, {activeDay} de {currentWeek.find(d => d.day === activeDay)?.month || ""}
          </h2>
          <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">{classes.filter(c => new Date(c.rawDate).getDate().toString() === activeDay).length} SESIONES</span>
        </div>
        <span className="font-label-md text-label-md text-primary font-semibold flex items-center">
          <span className="material-symbols-outlined text-[16px] mr-0.5">swap_vert</span>
          Por hora
        </span>
      </div>

      {/* Class Cards Schedule Stream */}
      <div className="flex flex-col px-margin-mobile gap-space-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">refresh</span>
          </div>
        ) : classes
              .filter(c => new Date(c.rawDate).getDate().toString() === activeDay)
              .filter(c => activeFilter === "all" || c.name === activeFilter)
              .filter(c => activeInstructor === "all" || c.instructor === activeInstructor)
              .filter(c => searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase())))
              .length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 px-6">
            <h4 className="font-headline-sm text-headline-sm text-primary font-bold mb-1">En Cuerpo y Alma no hay clases programadas hoy.</h4>
            <p className="font-body-md text-body-md text-on-surface-variant font-medium">Revisa el calendario o ajusta tu búsqueda.</p>
          </div>
        ) : classes
              .filter(c => new Date(c.rawDate).getDate().toString() === activeDay)
              .filter(c => activeFilter === "all" || c.name === activeFilter)
              .filter(c => activeInstructor === "all" || c.instructor === activeInstructor)
              .filter(c => searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase())))
              .map((cls) => {
          const isFull = cls.enrolled >= cls.maxCapacity;
          const available = cls.maxCapacity - cls.enrolled;

          return (
            <article key={cls.id} className="class-card group flex flex-col card-light border-l-[4px] border-l-primary p-space-md transition-all duration-200">
              
              {/* Header: Type and Time */}
              <div className="flex flex-col mb-3">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wide">{cls.name}</span>
                </div>
                <div className="flex items-center justify-between opacity-70 font-body-sm">
                  <span>Presencial</span>
                  <span className="font-bold opacity-100">{cls.timeRange}</span>
                </div>
              </div>

              {/* Title & Instructor */}
              <h3 className="font-headline-md text-headline-sm font-bold mb-1">{cls.name}</h3>
              <div className="flex items-center gap-2 mb-3 opacity-70 font-body-sm">
                <span>con</span>
                {cls.instructorId ? (
                  <Link href={`/alumno/profesor/${cls.instructorId}`} className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded-lg -ml-2 transition-colors active:scale-95 group">
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                      {cls.instructor.charAt(0)}
                    </div>
                    <span className="font-medium underline decoration-primary/30 decoration-2 underline-offset-2 group-hover:decoration-primary">{cls.instructor}</span>
                  </Link>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                      {cls.instructor.charAt(0)}
                    </div>
                    <span className="font-medium">{cls.instructor}</span>
                  </>
                )}
              </div>

              {/* Meta details */}
              <div className="flex items-center justify-between opacity-70 font-body-sm mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  <span>{cls.duration} minutos</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[18px]">local_activity</span>
                  {isFull ? (
                    <span className="text-error">Clase Llena</span>
                  ) : (
                    <span>{available} <span className="font-normal opacity-70">/ {cls.maxCapacity} Cupos</span></span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-space-xs pt-space-xs border-t border-black/5 dark:border-white/5">
                {isFull ? (
                  <div className="grid grid-cols-2 gap-space-xs">
                    <button 
                      onClick={() => handleReservar(cls.id, cls.enrolled, cls.maxCapacity)}
                      className="waitlist-btn h-[48px] rounded-xl bg-black/5 dark:bg-white/5 font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">queue</span>
                      <span className="">Lista Espera</span>
                    </button>
                    <button className="h-[48px] rounded-xl bg-black/10 dark:bg-white/10 font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] hover:opacity-80">
                      <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                      <span className="">Otro Horario</span>
                    </button>
                  </div>
                ) : misReservas.includes(cls.id) ? (
                  <button 
                    disabled
                    className="booking-btn w-full h-[48px] rounded-xl bg-black/5 dark:bg-white/5 text-primary font-label-lg text-label-lg font-bold shadow-sm flex items-center justify-center gap-2 opacity-80"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span className="">Reservado</span>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => handleReservar(cls.id, cls.enrolled, cls.maxCapacity)}
                      className="booking-btn w-full h-[48px] rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-[20px]">bolt</span>
                      <span className="">Reservar Cupo</span>
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}

      </div>

      {/* Studio Policy Micro-Copy Box */}
      <section className="mt-space-lg px-margin-mobile">
        <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low shadow-sm border border-surface-container">
          <span className="material-symbols-outlined text-primary text-[22px] flex-shrink-0 mt-0.5">info</span>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface font-bold">Política de Asistencia Flexible</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Las reservas pueden cancelarse hasta <strong className="text-on-surface">4 horas antes</strong> del inicio de la sesión.
            </p>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-surface-container-highest border border-surface-container-high text-on-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md w-full">
          <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
          <span className="font-label-md text-label-md leading-tight flex-1">{toastMessage}</span>
        </div>
      </div>

      {/* Reservation Modal (No Plan) */}
      {isReservationModalOpen && selectedClassToBook && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-margin-mobile animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-surface rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-space-md py-space-sm bg-surface-container-lowest border-b border-surface-container">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate pr-4">
                {selectedClassToBook.name}
              </h2>
              <button 
                onClick={() => setIsReservationModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Tabs Mock */}
            <div className="flex border-b border-surface-container px-space-md">
              <div className="py-3 border-b-2 border-primary text-primary font-label-md font-bold mr-space-lg">
                Agendar
              </div>
              <div className="py-3 text-on-surface-variant font-label-md">
                Participantes
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col p-space-md items-center text-center gap-space-md bg-surface-container-lowest">
              {activeSubscription && activeSubscription.creditos_restantes > 0 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  </div>
                  <h3 className="font-headline-sm text-[20px] text-on-surface leading-snug">
                    Confirmar Reserva
                  </h3>
                  <p className="font-body-sm text-[14px] text-on-surface-variant">
                    Se descontará 1 crédito de tu plan <strong>{activeSubscription.planes?.nombre_plan || "Activo"}</strong>.<br/>
                    Te quedan {activeSubscription.creditos_restantes} créditos.
                  </p>
                  
                  <button 
                    onClick={handleConfirmBook}
                    disabled={isBooking}
                    className="w-full mt-2 h-12 bg-primary text-on-primary rounded-xl font-label-lg font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isBooking ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      "Confirmar Reserva"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <span className="material-symbols-outlined text-[32px]">credit_card_off</span>
                  </div>
                  <h3 className="font-headline-sm text-[20px] text-on-surface leading-snug">
                    Necesitas un plan que permita agendar esta sesión
                  </h3>
                  <p className="font-body-sm text-[14px] text-on-surface-variant">
                    No tienes un plan activo o créditos suficientes para reservar.
                  </p>
                  
                  <a 
                    href="/alumno/tienda"
                    className="w-full mt-2 h-12 bg-primary text-on-primary rounded-xl font-label-lg font-bold flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Ver planes que permiten agendar
                  </a>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-surface-container-low px-space-md py-3 text-center border-t border-surface-container">
              <p className="font-body-sm text-[12px] text-on-surface-variant">
                Cierre de reservas a las 11:30 pm el día antes de la sesión
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorarPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-surface pb-bottom-nav-safe"><span className="material-symbols-outlined animate-spin text-primary text-[48px]">refresh</span></div>}>
      <ExplorarContent />
    </Suspense>
  );
}
