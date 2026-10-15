"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  name: string;
  last_name: string;
  rut: string | null;
  phone: string;
  correo: string | null;
  active: boolean;
  role: string;
  sala_por_defecto?: string | null;
  created_at: string;
}

export default function AdminGestionPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "calendar" | "types" | "salas">("calendar");
  
  // SCHEDULE STATE (Plantillas/Horarios Fijos)
  const [selectedDay, setSelectedDay] = useState("Lun");
  const daysFilter = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [calendarSubView, setCalendarSubView] = useState<"plantillas" | "sesiones">("plantillas");
  const [realClasses, setRealClasses] = useState<any[]>([]);
  const [isLoadingRealClasses, setIsLoadingRealClasses] = useState(false);
  
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [tName, setTName] = useState("");
  const [tProf, setTProf] = useState("");
  const [tRoom, setTRoom] = useState("");
  const [tStartTime, setTStartTime] = useState("18:00");
  const [tEndTime, setTEndTime] = useState("19:15");
  const [tDays, setTDays] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleTDay = (day: string) => {
    setTDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // STAFF STATE
  const [profesores, setProfesores] = useState<Profile[]>([]);
  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // CONFIG STATE (Types & Salas)
  const [classTypes, setClassTypes] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // EDIT PROFESSOR
  const [selectedProf, setSelectedProf] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSala, setEditSala] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (activeTab === "calendar") fetchPlantillas();
    if (activeTab === "staff") {
      fetchProfesores();
      fetchInvitaciones();
    }
    if (activeTab === "types" || activeTab === "salas" || activeTab === "staff" || activeTab === "calendar") {
      fetchTiposYSalas();
    }
    // Para el modal de añadir plantilla, cargamos a los profes
    if (activeTab === "calendar" && profesores.length === 0) {
      fetchProfesores();
    }
  }, [activeTab, selectedDay]);

  async function fetchTiposYSalas() {
    if (!supabase) return;
    const { data: tipos } = await supabase.from('tipos_clase').select('*').order('created_at', { ascending: true });
    if (tipos) setClassTypes(tipos);
    
    const { data: salasData } = await supabase.from('salas').select('*').order('created_at', { ascending: true });
    if (salasData) setSalas(salasData);
  }

  // --- STAFF FUNCTIONS ---
  async function fetchProfesores() {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("role", "profesor").order("name", { ascending: true });
    if (data) setProfesores(data);
  }

  async function fetchInvitaciones() {
    if (!supabase) return;
    const { data } = await supabase.from("roles_whitelist").select("*").eq("rol_asignado", "profesor");
    if (data) setInvitaciones(data);
  }

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !inviteEmail.trim()) return;
    
    const emailLower = inviteEmail.trim().toLowerCase();

    // 1. Check if it's already in the whitelist
    const { data: existingInvite } = await supabase
      .from("roles_whitelist")
      .select("correo")
      .eq("correo", emailLower)
      .maybeSingle();

    if (existingInvite) {
      alert("Error: Este correo ya tiene una invitación pendiente.");
      return;
    }

    // 2. Check if the user is already registered in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("correo")
      .eq("correo", emailLower)
      .maybeSingle();

    if (existingProfile) {
      alert("Error: Este correo ya tiene una cuenta registrada en la plataforma.");
      return;
    }
      
    // Generate a random 6-digit code
    const codigoInvitacion = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase.from("roles_whitelist").insert([{ 
      correo: inviteEmail.trim().toLowerCase(), 
      rol_asignado: "profesor",
      codigo_invitacion: codigoInvitacion 
    }]);
    
    if (error) {
      alert("Error al invitar. Quizás el correo ya está invitado.");
    } else {
      showToast(`Invitación enviada. Enviando correo...`);
      
      // Call our API to send the email via Resend
      try {
        await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteEmail.trim().toLowerCase(),
            role: "profesor",
            code: codigoInvitacion
          })
        });
        showToast("¡Correo enviado con éxito!");
      } catch (e) {
        console.error("No se pudo enviar el correo", e);
        showToast("Error al enviar el correo, pero el código es válido.");
      }

      setInviteEmail("");
      setIsInviteModalOpen(false);
      fetchInvitaciones();
    }
  };

  const handleCancelarInvitacion = async (correo: string) => {
    if (!supabase) return;
    if (!window.confirm(`¿Cancelar la invitación a ${correo}?`)) return;
    await supabase.from("roles_whitelist").delete().eq("correo", correo);
    fetchInvitaciones();
  };

  const handleDemote = async () => {
    if (!supabase || !selectedProf) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cuenta de profesor de ${selectedProf.name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("profiles").update({ role: "alumno" }).eq("id", selectedProf.id);
    if (!error) {
      showToast("Cuenta eliminada con éxito.");
      setSelectedProf(null);
      fetchProfesores();
    }
  };

  const handleSaveEdit = async () => {
    if (!supabase || !selectedProf) return;
    const updates: any = {
      name: editName,
      last_name: editLastName,
      phone: editPhone
    };
    if (editSala) updates.sala_por_defecto = editSala;
    
    const { error } = await supabase.from("profiles").update(updates).eq("id", selectedProf.id);
    if (!error) {
      showToast("Datos actualizados.");
      setSelectedProf(null);
      fetchProfesores();
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean, e?: any) => {
    if (e) e.stopPropagation();
    if (!supabase) return;
    await supabase.from("profiles").update({ active: !currentStatus }).eq("id", id);
    if (selectedProf && selectedProf.id === id) {
      setSelectedProf({ ...selectedProf, active: !currentStatus });
    }
    fetchProfesores();
  };

  // --- CONFIG FUNCTIONS ---
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newTypeName.trim()) return;
    setIsAdding(true);
    await supabase.from('tipos_clase').insert([{ nombre: newTypeName.trim(), icono: "sports_gymnastics" }]);
    setIsAdding(false);
    setNewTypeName("");
    fetchTiposYSalas();
  };

  const handleDeleteType = async (id: string) => {
    if (!supabase) return;
    await supabase.from('tipos_clase').delete().eq('id', id);
    fetchTiposYSalas();
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newRoomName.trim()) return;
    setIsAdding(true);
    await supabase.from('salas').insert([{ nombre: newRoomName.trim() }]);
    setIsAdding(false);
    setNewRoomName("");
    fetchTiposYSalas();
  };

  const handleDeleteRoom = async (id: string) => {
    if (!supabase) return;
    await supabase.from('salas').delete().eq('id', id);
    fetchTiposYSalas();
  };

  // --- CALENDAR (PLANTILLAS) FUNCTIONS ---
  function formatLocalDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  async function fetchPlantillas() {
    if (!supabase) return;
    const { data } = await supabase
      .from('plantillas_clase')
      .select(`id_plantilla, dia_semana, hora_inicio, hora_fin, nombre_clase, sala, profiles:id_profesor (name)`)
      .order('hora_inicio', { ascending: true });

    if (data) {
      const daysOfWeekMap = { "Dom": 0, "Lun": 1, "Mar": 2, "Mié": 3, "Jue": 4, "Vie": 5, "Sáb": 6 };
      const targetDay = daysOfWeekMap[selectedDay as keyof typeof daysOfWeekMap];
      
      const filteredData = data.filter((c: any) => c.dia_semana === targetDay);

      const grouped: Record<string, any> = {};
      
      filteredData.forEach((c: any) => {
         const timeParts = c.hora_inicio.split(':');
         let hour = parseInt(timeParts[0]);
         const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
         hour = hour % 12;
         hour = hour ? hour : 12; 
         const timeStr = `${hour.toString().padStart(2, '0')}:${timeParts[1]} ${ampm}`;

         const sortKey = `${timeParts[0]}:${timeParts[1]}`;

         if (!grouped[sortKey]) grouped[sortKey] = { time: timeStr, sortKey, items: [] };
         
         let profName = Array.isArray(c.profiles) ? c.profiles[0]?.name : (c.profiles?.name || "Profesor");
         grouped[sortKey].items.push({ id: c.id_plantilla, name: c.nombre_clase, prof: profName, sala: c.sala || "Sala Principal" });
      });
      setScheduleData(Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey)));
    } else {
      setScheduleData([]);
    }
  }


  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    if (tDays.length === 0) {
      alert("Por favor selecciona al menos un día para este bloque.");
      return;
    }

    const daysOfWeekMap = { "Dom": 0, "Lun": 1, "Mar": 2, "Mié": 3, "Jue": 4, "Vie": 5, "Sáb": 6 };
    
    const inserts = tDays.map(dayStr => ({
      dia_semana: daysOfWeekMap[dayStr as keyof typeof daysOfWeekMap],
      hora_inicio: tStartTime + ":00",
      hora_fin: tEndTime + ":00",
      nombre_clase: tName,
      id_profesor: tProf || null,
      sala: tRoom,
      cupo_maximo: 8
    }));

    const { error } = await supabase.from('plantillas_clase').insert(inserts);

    if (error) {
      alert("Error al guardar plantilla. ¿Ejecutaste el script horarios_fijos.sql en Supabase?");
      return;
    }

    // Generar inmediatamente las sesiones reales en 'clase' para las próximas 4 semanas
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [sh, sm] = tStartTime.split(':').map(Number);
      const [eh, em] = tEndTime.split(':').map(Number);
      const targetDayNums = new Set(tDays.map(d => daysOfWeekMap[d as keyof typeof daysOfWeekMap]));

      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 28);

      const { data: existingClasses } = await supabase.from('clase')
        .select('nombre_clase, fecha_hora_inicio')
        .gte('fecha_hora_inicio', formatLocalDateTime(today))
        .lte('fecha_hora_inicio', formatLocalDateTime(futureDate));

      const existingSet = new Set((existingClasses || []).map((c: any) => `${c.nombre_clase}_${c.fecha_hora_inicio}`));

      const classSessions: any[] = [];
      for (let i = 0; i < 28; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        if (targetDayNums.has(currentDate.getDay())) {
          const startDate = new Date(currentDate);
          startDate.setHours(sh || 0, sm || 0, 0, 0);

          const endDate = new Date(currentDate);
          endDate.setHours(eh || 0, em || 0, 0, 0);

          const startStr = formatLocalDateTime(startDate);
          const endStr = formatLocalDateTime(endDate);
          const key = `${tName}_${startStr}`;

          if (!existingSet.has(key)) {
            classSessions.push({
              nombre_clase: tName,
              fecha_hora_inicio: startStr,
              fecha_hora_fin: endStr,
              id_profesor: tProf || null,
              sala: tRoom,
              cupo_maximo: 8,
              cupos_inscritos: 0,
              estado_clase: "programada"
            });
          }
        }
      }

      if (classSessions.length > 0) {
        await supabase.from('clase').insert(classSessions);
      }
    } catch (genErr) {
      console.error("Error al generar sesiones para el bloque:", genErr);
    }

    showToast("Bloque añadido y sesiones generadas en el calendario.");
    setIsAddingTemplate(false);
    setTName("");
    fetchPlantillas();
    fetchRealClasses();
  };

  const handleDeleteTemplate = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;

    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la clase "${name}" de los horarios de los ${selectedDay}?`);
    if (!confirmDelete) return;

    try {
      // 1. Eliminar la plantilla fija
      const { error: errTemplate } = await supabase
        .from('plantillas_clase')
        .delete()
        .eq('id_plantilla', id);

      if (errTemplate) throw errTemplate;

      // 2. Preguntar si también desea eliminar las clases ya generadas en el calendario
      const deleteFuture = window.confirm(
        `¿Deseas también eliminar del calendario las clases programadas futuras de "${name}"?`
      );

      if (deleteFuture) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { error: errClasses } = await supabase
          .from('clase')
          .delete()
          .eq('nombre_clase', name)
          .gte('fecha_hora_inicio', formatLocalDateTime(today));

        if (errClasses) {
          console.error("Error al eliminar clases futuras:", errClasses);
          showToast(`Horario eliminado, pero hubo un error con las clases futuras.`);
        } else {
          showToast(`Clase "${name}" y sesiones futuras eliminadas.`);
        }
      } else {
        showToast(`Horario de "${name}" eliminado.`);
      }

      fetchPlantillas();
      fetchRealClasses();
    } catch (err: any) {
      console.error(err);
      alert("Error al eliminar: " + (err.message || err));
    }
  };

  async function fetchRealClasses() {
    if (!supabase) return;
    setIsLoadingRealClasses(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('clase')
        .select('*, profiles:id_profesor(name, last_name)')
        .gte('fecha_hora_inicio', formatLocalDateTime(today))
        .order('fecha_hora_inicio', { ascending: true })
        .limit(60);

      if (error) throw error;
      setRealClasses(data || []);
    } catch (err) {
      console.error("Error fetching real classes:", err);
    } finally {
      setIsLoadingRealClasses(false);
    }
  }

  const handleDeleteRealClass = async (id: number, name: string, dateStr: string) => {
    if (!supabase) return;
    const formattedDate = new Date(dateStr).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la sesión de "${name}" del ${formattedDate}? Todas las reservas asociadas serán canceladas automáticamente.`)) return;

    try {
      const { error } = await supabase.from('clase').delete().eq('id_clase', id);
      if (error) throw error;
      showToast(`Sesión de "${name}" eliminada.`);
      fetchRealClasses();
    } catch (err: any) {
      alert("Error al eliminar la clase: " + err.message);
    }
  };

  const handleGenerateClasses = async () => {
    if (!supabase) return;
    if (!window.confirm("Esto generará las clases reales en el calendario para las próximas 4 semanas usando las plantillas actuales. Las clases que ya existen no se duplicarán. ¿Deseas continuar?")) return;
    
    setIsGenerating(true);
    showToast("Generando clases, por favor espera...");
    
    try {
      const { data: templates, error: templatesError } = await supabase.from('plantillas_clase').select('*');
      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
         showToast("No hay plantillas para generar.");
         setIsGenerating(false);
         return;
      }
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 28);
      
      const { data: existingClasses } = await supabase.from('clase')
          .select('nombre_clase, fecha_hora_inicio')
          .gte('fecha_hora_inicio', formatLocalDateTime(today))
          .lte('fecha_hora_inicio', formatLocalDateTime(futureDate));
          
      const existingSet = new Set((existingClasses || []).map(c => `${c.nombre_clase}_${c.fecha_hora_inicio}`));
      
      const inserts: any[] = [];
      
      for (let i = 0; i < 28; i++) {
         const currentDate = new Date(today);
         currentDate.setDate(today.getDate() + i);
         const currentDayNum = currentDate.getDay(); 
         
         const matchingTemplates = templates.filter(t => t.dia_semana === currentDayNum);
         
         matchingTemplates.forEach(t => {
            const startDate = new Date(currentDate);
            const [sh, sm] = t.hora_inicio.split(':');
            startDate.setHours(parseInt(sh), parseInt(sm), 0, 0);
            
            const endDate = new Date(currentDate);
            const [eh, em] = t.hora_fin.split(':');
            endDate.setHours(parseInt(eh), parseInt(em), 0, 0);
            
            const startStr = formatLocalDateTime(startDate);
            const endStr = formatLocalDateTime(endDate);
            const key = `${t.nombre_clase}_${startStr}`;
            
            if (!existingSet.has(key)) {
                inserts.push({
                   nombre_clase: t.nombre_clase,
                   fecha_hora_inicio: startStr,
                   fecha_hora_fin: endStr,
                   id_profesor: t.id_profesor,
                   sala: t.sala,
                   cupo_maximo: t.cupo_maximo,
                   cupos_inscritos: 0,
                   estado_clase: "programada"
                });
            }
         });
      }
      
      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('clase').insert(inserts);
        if (insertError) throw insertError;
        showToast(`¡Éxito! Se generaron ${inserts.length} nuevas clases para el mes.`);
      } else {
        showToast(`Todo al día. No hubo clases nuevas que generar.`);
      }
      fetchRealClasses();
    } catch (err: any) {
      console.error(err);
      alert("Error al generar las clases: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 bg-surface min-h-screen">
      
      <section className="px-gutter-mobile pt-space-md sticky top-0 glass-panel border-x-0 border-t-0 rounded-none z-10 pb-2 border-b border-surface-container shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline-md text-headline-md gradient-text font-bold">Gestión Academia</h1>
          {activeTab === "staff" && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 h-10 rounded-full premium-btn flex items-center gap-2 shadow-sm active:scale-95 transition-transform font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">mail</span>
              Invitar
            </button>
          )}
          {activeTab === "calendar" && (
            <div className="flex gap-2">
              <button 
                onClick={handleGenerateClasses}
                disabled={isGenerating}
                className="px-3 h-10 rounded-full bg-secondary text-on-secondary flex items-center gap-1 shadow-sm active:scale-95 transition-transform font-bold text-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">{isGenerating ? 'sync' : 'event_repeat'}</span>
                {isGenerating ? '...' : 'Repetir'}
              </button>
              <button 
                onClick={() => {
                  setTDays([selectedDay]);
                  setIsAddingTemplate(true);
                }}
                className="px-3 h-10 rounded-full premium-btn flex items-center gap-1 shadow-sm active:scale-95 transition-transform font-bold text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Bloque
              </button>
            </div>
          )}
        </div>
        
        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar bg-surface-container-low rounded-xl p-1 gap-1 -mx-2 px-2">
          <button onClick={() => setActiveTab("staff")} className={`shrink-0 px-4 py-2.5 rounded-lg font-label-md font-bold transition-colors ${activeTab === "staff" ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant"}`}>
            Equipo Docente
          </button>
          <button onClick={() => setActiveTab("calendar")} className={`shrink-0 px-4 py-2.5 rounded-lg font-label-md font-bold transition-colors ${activeTab === "calendar" ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant"}`}>
            Horarios
          </button>
          <button onClick={() => setActiveTab("types")} className={`shrink-0 px-4 py-2.5 rounded-lg font-label-md font-bold transition-colors ${activeTab === "types" ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant"}`}>
            Disciplinas
          </button>
          <button onClick={() => setActiveTab("salas")} className={`shrink-0 px-4 py-2.5 rounded-lg font-label-md font-bold transition-colors ${activeTab === "salas" ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant"}`}>
            Salas
          </button>
        </div>
      </section>

      {/* STAFF TAB */}
      {activeTab === "staff" && (
        <section className="px-gutter-mobile mt-space-md animate-in fade-in flex flex-col gap-3">
          {/* INVITACIONES PENDIENTES */}
          {invitaciones.length > 0 && (
            <div className="mb-6">
              <h3 className="font-label-lg font-bold text-on-surface-variant mb-3 px-1 uppercase tracking-wider text-xs">Invitaciones Pendientes</h3>
              <div className="flex flex-col gap-3">
                {invitaciones.map((inv) => (
                  <article key={inv.correo} className="flex items-center justify-between p-4 premium-card border-dashed rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined">mail</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md text-on-surface font-semibold">{inv.correo}</span>
                        <span className="font-body-sm text-secondary">Pendiente de registro</span>
                      </div>
                    </div>
                    <button onClick={() => handleCancelarInvitacion(inv.correo)} className="p-2 text-error hover:bg-error/10 rounded-full transition-colors">
                      <span className="material-symbols-outlined">cancel</span>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-label-lg font-bold text-on-surface-variant mb-3 px-1 uppercase tracking-wider text-xs">Profesores Activos</h3>
          {profesores.length === 0 ? (
            <p className="text-center text-on-surface-variant my-10">No hay profesores en el equipo.</p>
          ) : (
            profesores.map(prof => (
              <article key={prof.id} onClick={() => { setSelectedProf(prof); setEditName(prof.name||""); setEditLastName(prof.last_name||""); setEditPhone(prof.phone||""); setEditSala(prof.sala_por_defecto||""); }} className="p-4 rounded-2xl premium-card p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xl">
                    {prof.name ? prof.name.charAt(0) : 'P'}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-label-lg font-bold text-on-surface">{prof.name} {prof.last_name}</h3>
                    <span className="font-body-sm text-secondary">{prof.sala_por_defecto || "Sin sala fija"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button onClick={(e) => toggleStatus(prof.id, prof.active, e)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prof.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {prof.active ? "Activo" : "Inactivo"}
                  </button>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* CALENDAR (PLANTILLAS Y SESIONES) TAB */}
      {activeTab === "calendar" && (
        <section className="px-gutter-mobile mt-space-md animate-in fade-in">
          {/* Sub-view switcher: Plantillas Semanales vs Sesiones Reales */}
          <div className="flex bg-surface-container-low p-1 rounded-xl mb-4 max-w-sm border border-surface-container">
            <button
              type="button"
              onClick={() => setCalendarSubView("plantillas")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                calendarSubView === "plantillas"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Horario Semanal
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarSubView("sesiones");
                fetchRealClasses();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                calendarSubView === "sesiones"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Sesiones Calendario
            </button>
          </div>

          {calendarSubView === "plantillas" ? (
            <>
              <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-2 -mx-gutter-mobile px-gutter-mobile">
                {daysFilter.map(day => (
                  <button key={day} onClick={() => setSelectedDay(day)} className={`shrink-0 px-4 py-2 rounded-full font-label-md font-bold transition-all ${selectedDay === day ? "premium-btn shadow-md" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}>
                    {day}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 pb-6">
                {scheduleData.length === 0 ? (
                   <div className="text-center bg-surface-container-lowest rounded-2xl border border-surface-container py-10 mt-2">
                     <span className="material-symbols-outlined text-[40px] text-surface-variant mb-2">calendar_today</span>
                     <p className="text-on-surface font-bold">Sin bloques fijos</p>
                     <p className="text-secondary text-sm mt-1">Añade plantillas para el {selectedDay}.</p>
                   </div>
                ) : (
                  scheduleData.map((slot, idx) => (
                    <div key={idx} className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                      <div className="bg-surface-container-low px-4 py-2 border-b border-surface-container font-label-lg font-bold text-on-surface">
                        {slot.time}
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-3">
                        {slot.items.map((c: any, i: number) => (
                          <div key={i} className="relative p-3.5 rounded-xl border border-surface-container-high bg-surface-container flex flex-col justify-between text-left shadow-sm hover:border-secondary/30 transition-all">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-label-caps text-secondary text-[11px] leading-tight truncate pr-1">
                                {c.sala}
                              </span>
                              <button 
                                type="button"
                                onClick={(e) => handleDeleteTemplate(c.id, c.name, e)} 
                                title={`Eliminar clase ${c.name}`}
                                className="w-7 h-7 rounded-full bg-error/10 hover:bg-error/20 active:bg-error text-error active:text-white flex items-center justify-center transition-colors shrink-0 -mt-0.5 -mr-0.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                            <span className="font-label-md text-on-surface font-bold leading-snug line-clamp-2">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-secondary">person</span>
                              <span className="truncate">{c.prof}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* SESIONES REALES EN CALENDARIO */
            <div className="flex flex-col gap-3 pb-6">
              {isLoadingRealClasses ? (
                <div className="flex justify-center p-10">
                  <span className="material-symbols-outlined animate-spin text-secondary text-3xl">refresh</span>
                </div>
              ) : realClasses.length === 0 ? (
                <div className="text-center bg-surface-container-lowest rounded-2xl border border-surface-container py-10 mt-2">
                  <span className="material-symbols-outlined text-[40px] text-surface-variant mb-2">event_busy</span>
                  <p className="text-on-surface font-bold">No hay sesiones programadas</p>
                  <p className="text-secondary text-sm mt-1">Usa el botón "Repetir" en Horario Semanal para generar las próximas 4 semanas.</p>
                </div>
              ) : (
                realClasses.map((cls) => {
                  const startDate = new Date(cls.fecha_hora_inicio);
                  const endDate = new Date(cls.fecha_hora_fin);
                  const dateStr = startDate.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
                  const timeRange = `${startDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
                  const profName = cls.profiles ? `${cls.profiles.name} ${cls.profiles.last_name || ''}`.trim() : 'Sin profesor';

                  return (
                    <article key={cls.id_clase} className="p-4 rounded-2xl premium-card flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-label-caps text-secondary text-xs uppercase font-bold tracking-wider">
                            {dateStr} • {timeRange}
                          </span>
                          <h3 className="font-headline-sm font-bold text-on-surface mt-0.5">
                            {cls.nombre_clase}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-label-caps text-[10px] font-bold shrink-0 ${
                          cls.estado_clase === 'cancelada' ? 'bg-error/10 text-error' :
                          cls.estado_clase === 'en_curso' ? 'bg-emerald-500/10 text-emerald-600' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {cls.estado_clase?.toUpperCase() || 'PROGRAMADA'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-surface-container">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-secondary">meeting_room</span>
                            {cls.sala || 'Sala Principal'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
                            {profName}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                            {cls.cupos_inscritos || 0} / {cls.cupo_maximo || 8}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRealClass(cls.id_clase, cls.nombre_clase, cls.fecha_hora_inicio)}
                          className="px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 active:bg-error text-error active:text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                          title="Eliminar sesión del calendario"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {/* TYPES TAB */}
      {activeTab === "types" && (
        <section className="px-gutter-mobile mt-space-md flex flex-col gap-space-md animate-in fade-in">
          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container">
            <h2 className="font-headline-sm font-bold gradient-text mb-2">Crear Disciplina</h2>
            <form onSubmit={handleAddType} className="flex gap-2">
              <input required type="text" placeholder="Ej. Pilates Reformer" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="flex-1 h-12 glass-panel border border-surface-container-highest rounded-xl px-4 text-on-surface focus:outline-none focus:border-secondary" />
              <button type="submit" disabled={isAdding || !newTypeName.trim()} className="h-12 px-6 rounded-xl bg-primary text-on-primary font-bold">Añadir</button>
            </form>
          </div>
          <div className="flex flex-col gap-2">
            {classTypes.map((type) => (
              <article key={type.id} className="flex items-center justify-between premium-card rounded-xl p-4">
                <span className="font-body-md text-on-surface font-semibold">{type.nombre}</span>
                <button onClick={() => handleDeleteType(type.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SALAS TAB */}
      {activeTab === "salas" && (
        <section className="px-gutter-mobile mt-space-md flex flex-col gap-space-md animate-in fade-in">
          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container">
            <h2 className="font-headline-sm font-bold gradient-text mb-2">Crear Sala de Clases</h2>
            <form onSubmit={handleAddRoom} className="flex gap-2">
              <input required type="text" placeholder="Ej. Sala Pole 1" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="flex-1 h-12 glass-panel border border-surface-container-highest rounded-xl px-4 text-on-surface focus:outline-none focus:border-secondary" />
              <button type="submit" disabled={isAdding || !newRoomName.trim()} className="h-12 px-6 rounded-xl bg-primary text-on-primary font-bold">Añadir</button>
            </form>
          </div>
          <div className="flex flex-col gap-2">
            {salas.length === 0 ? (
               <p className="text-body-sm text-on-surface-variant italic">Ejecuta salas.sql en Supabase primero si da error.</p>
            ) : (
              salas.map((sala) => (
                <article key={sala.id} className="flex items-center justify-between premium-card rounded-xl p-4">
                  <span className="font-body-md text-on-surface font-semibold">{sala.nombre}</span>
                  <button onClick={() => handleDeleteRoom(sala.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* MODAL: ADD TEMPLATE */}
      {isAddingTemplate && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-3xl rounded-b-none border-b-0 p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-md font-bold text-on-surface">Nuevo Bloque Múltiple</h3>
              <button onClick={() => setIsAddingTemplate(false)} className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddTemplate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Días de la semana</label>
                <div className="flex flex-wrap gap-2">
                  {daysFilter.map(day => (
                    <button 
                      key={day} 
                      type="button" 
                      onClick={() => toggleTDay(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${tDays.includes(day) ? 'premium-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Disciplina / Nivel</label>
                <select required value={tName} onChange={e => setTName(e.target.value)} className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none appearance-none">
                  <option value="">Selecciona disciplina...</option>
                  {classTypes.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Profesor a Cargo</label>
                <select required value={tProf} onChange={e => setTProf(e.target.value)} className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none appearance-none">
                  <option value="">Selecciona profesor...</option>
                  {profesores.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Sala</label>
                <select required value={tRoom} onChange={e => setTRoom(e.target.value)} className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none appearance-none">
                  <option value="">Selecciona sala...</option>
                  {salas.map(s => (
                    <option key={s.id} value={s.nombre}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-secondary mb-1 block">Inicio</label>
                  <input required type="time" value={tStartTime} onChange={e => setTStartTime(e.target.value)} className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-secondary mb-1 block">Fin (1h 15m)</label>
                  <input required type="time" value={tEndTime} onChange={e => setTEndTime(e.target.value)} className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full h-12 premium-btn font-bold rounded-xl mt-4 shadow-md">
                Crear Bloque Fijo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFESSOR */}
      {selectedProf && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-3xl rounded-b-none border-b-0 p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-md font-bold text-on-surface">Modificar Profesor</h3>
              <button onClick={() => setSelectedProf(null)} className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="Nombre" value={editName} onChange={e => setEditName(e.target.value)} className="h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none" />
              <input type="text" placeholder="Apellido" value={editLastName} onChange={e => setEditLastName(e.target.value)} className="h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none" />
              <input type="text" placeholder="Teléfono" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none" />
              
              <select value={editSala} onChange={e => setEditSala(e.target.value)} className="h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none appearance-none">
                <option value="">Sin sala fija (Libre)</option>
                {salas.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>

              <button onClick={handleSaveEdit} className="w-full h-12 bg-primary text-on-primary font-bold rounded-xl mt-2">Guardar Cambios</button>
              
              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => toggleStatus(selectedProf.id, selectedProf.active)} 
                  className={`flex-1 h-12 font-bold rounded-xl border ${selectedProf.active ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}
                >
                  {selectedProf.active ? "Pausar Cuenta" : "Reactivar Cuenta"}
                </button>
                <button 
                  onClick={handleDemote} 
                  className="flex-1 h-12 bg-error/10 text-error font-bold rounded-xl border border-error/20"
                >
                  Eliminar Cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVITAR PROFESOR */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-3xl rounded-b-none border-b-0 p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm font-bold gradient-text">Invitar Profesor</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="w-8 h-8 bg-surface-container rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-2">Ingresa el correo del nuevo profesor. Solo los correos invitados podrán registrarse y obtendrán el rol de profesor automáticamente.</p>
            <form onSubmit={handleInvitar} className="flex flex-col gap-4">
              <input 
                required 
                type="email" 
                placeholder="correo@ejemplo.com" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                className="w-full h-12 bg-surface-container-low rounded-xl px-4 text-on-surface focus:outline-none focus:border-primary border border-transparent" 
              />
              <button type="submit" className="w-full h-12 premium-btn font-bold rounded-xl mt-2 shadow-md">
                Enviar Invitación
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
