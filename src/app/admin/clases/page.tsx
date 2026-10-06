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
  const [activeTab, setActiveTab] = useState<"staff" | "calendar" | "types" | "salas">("staff");
  
  // SCHEDULE STATE
  const [selectedDay, setSelectedDay] = useState("Hoy");
  const daysFilter = ["Hoy", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Semana"];
  const [scheduleData, setScheduleData] = useState<any[]>([]);

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
    if (activeTab === "calendar") fetchClases();
    if (activeTab === "staff") {
      fetchProfesores();
      fetchInvitaciones();
    }
    if (activeTab === "types" || activeTab === "salas" || activeTab === "staff") {
      fetchTiposYSalas();
    }
  }, [activeTab, selectedDay]);

  async function fetchTiposYSalas() {
    if (!supabase) return;
    const { data: tipos } = await supabase.from('tipos_clase').select('*').order('created_at', { ascending: true });
    if (tipos) setClassTypes(tipos);
    
    // Salas might not exist yet, catch error gracefully
    const { data: salasData, error } = await supabase.from('salas').select('*').order('created_at', { ascending: true });
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
    const { error } = await supabase.from("roles_whitelist").insert([{ correo: inviteEmail.trim().toLowerCase(), rol_asignado: "profesor" }]);
    if (error) {
      alert("Error al invitar. Quizás el correo ya está invitado.");
    } else {
      showToast("Invitación enviada exitosamente.");
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
    if (!window.confirm(`¿Quitarle el cargo de profesor a ${selectedProf.name}?`)) return;
    const { error } = await supabase.from("profiles").update({ role: "alumno" }).eq("id", selectedProf.id);
    if (!error) {
      showToast("Cargo removido con éxito.");
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

  const toggleStatus = async (id: string, currentStatus: boolean, e: any) => {
    e.stopPropagation();
    if (!supabase) return;
    await supabase.from("profiles").update({ active: !currentStatus }).eq("id", id);
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
    const { error } = await supabase.from('salas').insert([{ nombre: newRoomName.trim() }]);
    setIsAdding(false);
    if (error) {
      alert("Error al crear sala. ¿Creaste la tabla en Supabase?");
    } else {
      setNewRoomName("");
      fetchTiposYSalas();
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!supabase) return;
    await supabase.from('salas').delete().eq('id', id);
    fetchTiposYSalas();
  };

  // --- CALENDAR FUNCTIONS ---
  async function fetchClases() {
    if (!supabase) return;
    const { data } = await supabase
      .from('clase')
      .select(`id_clase, nombre_clase, fecha_hora_inicio, sala, profiles:id_profesor (name)`)
      .eq('estado_clase', 'programada')
      .order('fecha_hora_inicio', { ascending: true });

    if (data) {
      let filteredData = data;
      const now = new Date();
      if (selectedDay !== "Semana") {
        const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        let targetDay = now.getDay();
        if (selectedDay !== "Hoy") {
          const index = daysOfWeek.indexOf(selectedDay);
          if (index !== -1) targetDay = index;
        }
        filteredData = data.filter((c: any) => new Date(c.fecha_hora_inicio).getDay() === targetDay);
      }

      const grouped: Record<string, any> = {};
      const defaultBlocks = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      defaultBlocks.forEach(time => { grouped[time] = { time, items: [] }; });
      
      filteredData.forEach((c: any) => {
         const date = new Date(c.fecha_hora_inicio);
         const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
         if (!grouped[timeStr]) grouped[timeStr] = { time: timeStr, items: [] };
         
         let profName = Array.isArray(c.profiles) ? c.profiles[0]?.name : (c.profiles?.name || "Profesor");
         grouped[timeStr].items.push({ id: c.id_clase, name: c.nombre_clase, prof: profName, sala: c.sala || "Sala Principal" });
      });
      setScheduleData(Object.values(grouped).sort((a: any, b: any) => a.time.localeCompare(b.time)));
    }
  }



  return (
    <div className="flex flex-col w-full pb-24 bg-surface min-h-screen">
      
      <section className="px-gutter-mobile pt-space-md sticky top-0 bg-surface/90 backdrop-blur-md z-10 pb-2 border-b border-surface-container shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Gestión Academia</h1>
          {activeTab === "staff" && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 h-10 rounded-full bg-[#D4AF37] text-white flex items-center gap-2 shadow-sm active:scale-95 transition-transform font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">mail</span>
              Invitar
            </button>
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
                  <article key={inv.correo} className="flex items-center justify-between p-4 bg-surface-container-low border border-dashed border-surface-container-highest rounded-2xl">
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
              <article key={prof.id} onClick={() => { setSelectedProf(prof); setEditName(prof.name||""); setEditLastName(prof.last_name||""); setEditPhone(prof.phone||""); setEditSala(prof.sala_por_defecto||""); }} className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex items-center justify-between cursor-pointer">
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

      {/* CALENDAR TAB */}
      {activeTab === "calendar" && (
        <section className="px-gutter-mobile mt-space-md animate-in fade-in">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-2 -mx-gutter-mobile px-gutter-mobile">
            {daysFilter.map(day => (
              <button key={day} onClick={() => setSelectedDay(day)} className={`shrink-0 px-4 py-2 rounded-full font-label-md font-bold transition-all ${selectedDay === day ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-low text-on-surface-variant"}`}>
                {day}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {scheduleData.length === 0 ? (
               <p className="text-center text-on-surface-variant my-10">No hay clases programadas.</p>
            ) : (
              scheduleData.map((slot, idx) => (
                <div key={idx} className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                  <div className="bg-surface-container-low px-4 py-2 border-b border-surface-container font-label-lg font-bold text-on-surface">
                    {slot.time}
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3">
                    {slot.items.length === 0 ? (
                      <div className="col-span-2 text-center py-2 text-on-surface-variant font-label-sm border border-dashed rounded-xl border-surface-variant">Libre</div>
                    ) : (
                      slot.items.map((c: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl border border-surface-container-high bg-surface-container flex flex-col justify-center text-center">
                          <span className="font-label-caps text-secondary mb-1">{c.sala}</span>
                          <span className="font-label-md text-on-surface font-bold">{c.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{c.prof}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TYPES TAB */}
      {activeTab === "types" && (
        <section className="px-gutter-mobile mt-space-md flex flex-col gap-space-md animate-in fade-in">
          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container">
            <h2 className="font-headline-sm font-bold text-on-surface mb-2">Crear Disciplina</h2>
            <form onSubmit={handleAddType} className="flex gap-2">
              <input required type="text" placeholder="Ej. Pilates Reformer" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="flex-1 h-12 bg-surface-container border border-surface-container-highest rounded-xl px-4 text-on-surface focus:outline-none focus:border-secondary" />
              <button type="submit" disabled={isAdding || !newTypeName.trim()} className="h-12 px-6 rounded-xl bg-primary text-on-primary font-bold">Añadir</button>
            </form>
          </div>
          <div className="flex flex-col gap-2">
            {classTypes.map((type) => (
              <article key={type.id} className="flex items-center justify-between bg-surface-container-lowest border border-surface-container rounded-xl p-4">
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
            <h2 className="font-headline-sm font-bold text-on-surface mb-2">Crear Sala de Clases</h2>
            <form onSubmit={handleAddRoom} className="flex gap-2">
              <input required type="text" placeholder="Ej. Sala Pole 1" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="flex-1 h-12 bg-surface-container border border-surface-container-highest rounded-xl px-4 text-on-surface focus:outline-none focus:border-secondary" />
              <button type="submit" disabled={isAdding || !newRoomName.trim()} className="h-12 px-6 rounded-xl bg-primary text-on-primary font-bold">Añadir</button>
            </form>
          </div>
          <div className="flex flex-col gap-2">
            {salas.length === 0 ? (
               <p className="text-body-sm text-on-surface-variant italic">Ejecuta salas.sql en Supabase primero si da error.</p>
            ) : (
              salas.map((sala) => (
                <article key={sala.id} className="flex items-center justify-between bg-surface-container-lowest border border-surface-container rounded-xl p-4">
                  <span className="font-body-md text-on-surface font-semibold">{sala.nombre}</span>
                  <button onClick={() => handleDeleteRoom(sala.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* MODAL: EDIT PROFESSOR */}
      {selectedProf && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="bg-surface-container-lowest w-full rounded-t-3xl p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
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
              <button onClick={handleDemote} className="w-full h-12 bg-error/10 text-error font-bold rounded-xl border border-error/20">Quitar Cargo de Profesor</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVITAR PROFESOR */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="bg-surface-container-lowest w-full rounded-t-3xl p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm font-bold text-on-surface">Invitar Profesor</h3>
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
              <button type="submit" className="w-full h-12 bg-[#D4AF37] text-white font-bold rounded-xl mt-2 shadow-md">
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
