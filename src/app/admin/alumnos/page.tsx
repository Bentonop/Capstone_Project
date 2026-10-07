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
  contacto_emergencia?: string | null;
  condicion_medica?: string | null;
  created_at: string;
}

interface PagoPendiente {
  id: string;
  suscripcion_id: string;
  monto: number;
  metodo_pago: string;
  comprobante_url: string;
  estado: string;
  fecha_pago: string;
  user_id: string;
  profile?: Profile;
  plan?: { nombre_plan: string, creditos_clases: number };
}

export default function AdminAlumnosPage() {
  const [activeTab, setActiveTab] = useState<"alumnos" | "pagos">("alumnos");
  
  const [alumnos, setAlumnos] = useState<Profile[]>([]);
  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Ficha Medica Edit Modal State
  const [editingAlumno, setEditingAlumno] = useState<Profile | null>(null);
  const [editEmergencia, setEditEmergencia] = useState("");
  const [editFicha, setEditFicha] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (activeTab === "alumnos") {
      fetchAlumnos();
      fetchInvitaciones();
    }
    else fetchPagos();
  }, [activeTab]);

  async function fetchAlumnos() {
    try {
      setIsLoading(true);
      if (!supabase) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "alumno")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setAlumnos(data || []);
    } catch (error) {
      console.error("Error fetching alumnos:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchInvitaciones() {
    if (!supabase) return;
    const { data } = await supabase.from("roles_whitelist").select("*").eq("rol_asignado", "alumno");
    if (data) setInvitaciones(data);
  }

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !inviteEmail.trim()) return;
    
    // Generate a random 6-digit code
    const codigoInvitacion = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { error } = await supabase.from("roles_whitelist").insert([{ 
      correo: inviteEmail.trim().toLowerCase(), 
      rol_asignado: "alumno",
      codigo_invitacion: codigoInvitacion 
    }]);
    
    if (error) {
      alert("Error al invitar. Quizás el correo ya está invitado.");
    } else {
      showToast(`Invitación enviada. Código: ${codigoInvitacion}`);
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

  async function fetchPagos() {
    try {
      setIsLoading(true);
      if (!supabase) return;
      
      // Fetch pagos pendientes
      const { data: pagosData, error: pagosError } = await supabase
        .from("user_pagos")
        .select("*")
        .eq("estado", "pendiente")
        .order("fecha_pago", { ascending: true });
        
      if (pagosError) throw pagosError;
      
      // For each pago, fetch user info and plan info
      // In a real app this would be a join, doing it simply here for prototype
      const pagosEnriched = await Promise.all((pagosData || []).map(async (pago: any) => {
        const { data: profile } = await supabase!.from("profiles").select("*").eq("id", pago.user_id).single();
        
        // get suscripcion to get plan
        const { data: suscripcion } = await supabase!.from("user_suscripciones").select("plan_id").eq("id", pago.suscripcion_id).single();
        let plan = null;
        if (suscripcion) {
           const { data: planData } = await supabase!.from("planes").select("nombre_plan, creditos_clases").eq("id_plan", suscripcion.plan_id).single();
           plan = planData;
        }
        
        return { ...pago, profile, plan };
      }));

      setPagos(pagosEnriched);
    } catch (error) {
      console.error("Error fetching pagos:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("profiles").update({ active: !currentStatus }).eq("id", id);
      if (error) throw error;
      fetchAlumnos(); // refresh
    } catch (error) {
      console.error("Error toggling status", error);
    }
  };

  const procesarPago = async (pago: PagoPendiente, action: "aprobado" | "rechazado") => {
    if (!supabase) return;
    try {
      // 1. Update pago status
      const { error: pagoError } = await supabase.from("user_pagos").update({ estado: action }).eq("id", pago.id);
      if (pagoError) throw pagoError;
      
      // 2. If approved, update suscripcion status and add credits
      if (action === "aprobado") {
         const { data: currentSus } = await supabase.from("user_suscripciones").select("creditos_restantes").eq("id", pago.suscripcion_id).single();
         const currentCredits = currentSus?.creditos_restantes || 0;
         const newCredits = pago.plan?.creditos_clases || 0;

         const { error: susError } = await supabase.from("user_suscripciones").update({
           estado: "activa",
           creditos_restantes: currentCredits + newCredits
         }).eq("id", pago.suscripcion_id);
         if (susError) throw susError;
      }
      
      // 3. Refresh
      alert(`Pago ${action} con éxito.`);
      fetchPagos();
    } catch (error) {
      console.error("Error procesando pago", error);
      alert("Error procesando el pago. Verifica las tablas.");
    }
  };

  const handleSaveFicha = async () => {
    if (!supabase || !editingAlumno) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          contacto_emergencia: editEmergencia,
          condicion_medica: editFicha
        })
        .eq("id", editingAlumno.id);
      
      if (error) throw error;
      showToast("Ficha médica actualizada con éxito.");
      setEditingAlumno(null);
      fetchAlumnos(); // refresh
    } catch (error) {
      console.error("Error updating ficha", error);
      alert("Error al actualizar la ficha médica.");
    }
  };

  return (
    <div className="flex flex-col w-full pb-10 min-h-screen bg-surface">
      <header className="pt-safe pb-4 px-margin-mobile flex flex-col justify-end sticky top-0 z-10 glass-panel border-x-0 border-t-0 rounded-none border-b border-surface-container shadow-sm min-h-[90px]">
        <div className="flex items-center justify-between">
          <h1 className="font-headline-md text-headline-md gradient-text font-bold">Gestión de Alumnos</h1>
          {activeTab === "alumnos" && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 h-10 rounded-full premium-btn flex items-center gap-2 shadow-sm active:scale-95 transition-transform font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">mail</span>
              Invitar
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="px-margin-mobile pt-space-md">
        <div className="flex bg-surface-container-low rounded-xl p-1 mb-6">
          <button 
            onClick={() => setActiveTab("alumnos")}
            className={`flex-1 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'alumnos' ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            Directorio
          </button>
          <button 
            onClick={() => setActiveTab("pagos")}
            className={`flex-1 py-2.5 rounded-lg font-label-md font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pagos' ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            Pagos Pendientes
            {pagos.length > 0 && activeTab !== 'pagos' && (
              <span className="w-5 h-5 bg-error rounded-full text-white text-[11px] flex items-center justify-center">!</span>
            )}
          </button>
        </div>

        {/* ALUMNOS TAB */}
        {activeTab === "alumnos" && (
          <div className="animate-in fade-in">
            <div className="flex glass-panel rounded-xl px-4 h-12 items-center gap-2 mb-6 border border-surface-container-highest focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, RUT o correo..."
                className="bg-transparent border-none outline-none flex-1 font-body-md text-on-surface placeholder:text-on-surface-variant"
              />
            </div>

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

            {isLoading ? (
              <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></div>
            ) : alumnos.length === 0 ? (
              <div className="p-8 bg-surface-container-low border border-surface-container rounded-2xl flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-[48px] text-secondary mb-3">group_off</span>
                <h3 className="font-headline-sm text-on-surface">No hay alumnos registrados</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {alumnos.map((alumno) => (
                  <article key={alumno.id} className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-sm ${alumno.active ? 'bg-surface-container-lowest border-surface-container' : 'bg-surface-container-low border-surface-container opacity-70'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xl uppercase">
                          {alumno.name.charAt(0)}{alumno.last_name ? alumno.last_name.charAt(0) : ''}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-label-lg text-on-surface font-bold capitalize">{alumno.name} {alumno.last_name}</h3>
                          <span className="font-body-sm text-secondary">{alumno.rut || "Sin RUT"}</span>
                        </div>
                      </div>
                      <button onClick={() => toggleStatus(alumno.id, alumno.active)} className={`w-12 h-6 rounded-full flex items-center transition-all px-1 shadow-inner ${alumno.active ? 'bg-emerald-500 justify-end' : 'bg-surface-container-highest justify-start'}`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-surface-container font-body-sm text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        {alumno.correo || "No proporcionado"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">phone</span>
                        {alumno.phone || "No proporcionado"}
                      </div>
                      
                      {/* Medical & Emergency info */}
                      <div className="flex items-start gap-2 mt-2 bg-surface-container-lowest p-2 rounded-lg border border-surface-container">
                        <span className="material-symbols-outlined text-[18px] text-error mt-0.5">medical_services</span>
                        <div className="flex flex-col flex-1">
                          {alumno.contacto_emergencia && (
                            <span className="font-label-sm"><strong className="text-on-surface">Emergencia:</strong> {alumno.contacto_emergencia}</span>
                          )}
                          {alumno.condicion_medica ? (
                            <span className="font-body-xs italic line-clamp-2" title={alumno.condicion_medica}>{alumno.condicion_medica}</span>
                          ) : (
                            <span className="font-body-xs italic text-secondary">Sin ficha médica registrada</span>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setEditingAlumno(alumno);
                            setEditEmergencia(alumno.contacto_emergencia || "");
                            setEditFicha(alumno.condicion_medica || "");
                          }}
                          className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center transition-colors shrink-0 text-on-surface-variant hover:text-on-surface"
                          title="Editar Ficha"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button className="flex-1 h-10 rounded-lg glass-panel border border-surface-container-highest font-label-sm font-bold text-on-surface flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">history</span>
                        Historial
                      </button>
                      <button className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-sm font-bold flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Plan
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGOS TAB */}
        {activeTab === "pagos" && (
          <div className="animate-in fade-in">
            {isLoading ? (
              <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></div>
            ) : pagos.length === 0 ? (
              <div className="p-8 bg-surface-container-low border border-surface-container rounded-2xl flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-[48px] text-emerald-500 mb-3">task_alt</span>
                <h3 className="font-headline-sm text-on-surface">Todo al día</h3>
                <p className="font-body-sm text-on-surface-variant mt-1">No hay comprobantes de pago pendientes de revisión.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pagos.map((pago) => (
                  <article key={pago.id} className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">account_balance</span>
                        <span className="font-label-md font-bold text-primary">Transferencia Manual</span>
                      </div>
                      <span className="font-label-sm bg-primary text-on-primary px-2 py-0.5 rounded-full">Pendiente</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-headline-sm text-on-surface">{pago.profile?.name} {pago.profile?.last_name}</h3>
                      <p className="font-body-sm text-on-surface-variant">Intenta comprar: <span className="font-bold text-on-surface">{pago.plan?.nombre_plan || "Plan desconocido"}</span></p>
                      <p className="font-body-sm text-on-surface-variant">Monto reportado: <span className="font-bold text-on-surface">${pago.monto.toLocaleString()}</span></p>
                    </div>

                    <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container-high flex flex-col gap-1 mt-1">
                      <span className="font-label-sm font-bold text-on-surface-variant">Comprobante / Nro Transacción:</span>
                      <div className="flex items-center justify-between bg-surface-container-low px-2 py-1.5 rounded">
                        <span className="font-body-md text-on-surface font-mono truncate max-w-[180px]">
                          {pago.comprobante_url?.startsWith('data:image/') ? "📷 Imagen Adjunta" : (pago.comprobante_url || "No adjuntado")}
                        </span>
                        {pago.comprobante_url && (
                           <button 
                             onClick={() => setSelectedImage(pago.comprobante_url)}
                             className="text-primary hover:text-primary-fixed-variant flex items-center gap-1 font-label-sm font-bold bg-primary/10 px-2 py-1 rounded-md transition-colors active:scale-95"
                           >
                             <span className="material-symbols-outlined text-[16px]">visibility</span>
                             Ver
                           </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t border-primary/10">
                      <button onClick={() => procesarPago(pago, "rechazado")} className="flex-1 h-12 rounded-xl bg-surface-container border border-error/30 text-error font-label-md font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined">close</span>
                        Rechazar
                      </button>
                      <button onClick={() => procesarPago(pago, "aprobado")} className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-label-md font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md">
                        <span className="material-symbols-outlined">check</span>
                        Aprobar y Liberar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMAGE MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center bg-surface-container px-4 py-3 rounded-t-xl border-b border-surface-container-highest">
              <span className="font-label-lg font-bold text-on-surface flex items-center gap-2">
                 <span className="material-symbols-outlined text-[20px]">image</span>
                 Comprobante Adjunto
              </span>
              <button onClick={() => setSelectedImage(null)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="bg-surface-container-lowest rounded-b-xl overflow-hidden shadow-2xl flex items-center justify-center p-4">
              {(selectedImage.startsWith('data:image/') || selectedImage.startsWith('http')) ? (
                 <img src={selectedImage} alt="Comprobante Adjunto" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-surface-container-highest" />
              ) : (
                <div className="relative w-full aspect-[3/4] bg-surface-container rounded-lg border border-surface-container-highest overflow-hidden flex flex-col items-center justify-center">
                   <div className="absolute inset-x-0 top-0 h-6 bg-primary/20 flex gap-1.5 px-3 items-center border-b border-primary/10">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
                 </div>
                 <span className="material-symbols-outlined text-[64px] text-primary/40 mb-3 drop-shadow-sm">receipt_long</span>
                 <span className="font-label-lg text-secondary mb-1 uppercase tracking-widest">Cuerpo y Alma</span>
                 <span className="font-headline-sm font-bold gradient-text mb-3 text-center">Transferencia<br/>Recibida</span>
                 <div className="w-3/4 h-px bg-surface-container-highest my-3 border-b border-dashed border-secondary/30"></div>
                 <span className="font-body-sm text-secondary font-mono bg-surface-container-high px-3 py-1.5 rounded-md text-center max-w-[80%] break-all shadow-inner">
                   {selectedImage}
                 </span>
                 <span className="absolute bottom-4 font-body-xs text-secondary/60 text-center w-full">(Simulación visual del archivo)</span>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`fixed top-20 inset-x-4 z-[70] flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      </div>

      {/* EDIT MEDICAL MODAL */}
      {editingAlumno && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end animate-in fade-in" onClick={() => setEditingAlumno(null)}>
          <div className="glass-panel w-full rounded-t-3xl rounded-b-none border-b-0 p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 border-b border-surface-container pb-3">
              <h3 className="font-headline-sm font-bold gradient-text flex items-center gap-2">
                <span className="material-symbols-outlined text-error">medical_services</span>
                Ficha Médica
              </h3>
              <button onClick={() => setEditingAlumno(null)} className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-full hover:bg-surface-container-highest">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <p className="font-body-sm text-on-surface-variant">
              Actualizando datos de <strong>{editingAlumno.name} {editingAlumno.last_name}</strong>
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm font-bold text-on-surface">Número de Emergencia</label>
                <input 
                  type="text" 
                  placeholder="Ej. Mamá: +569 1234 5678" 
                  value={editEmergencia} 
                  onChange={e => setEditEmergencia(e.target.value)} 
                  className="h-12 glass-panel border border-surface-container-highest rounded-xl px-4 text-on-surface focus:outline-none focus:border-secondary" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm font-bold text-on-surface">Condiciones, Lesiones o Alergias</label>
                <textarea 
                  placeholder="Ej. Asma leve, lesión de rodilla..." 
                  value={editFicha} 
                  onChange={e => setEditFicha(e.target.value)} 
                  className="h-24 glass-panel border border-surface-container-highest rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-secondary resize-none font-body-sm" 
                />
              </div>

              <button onClick={handleSaveFicha} className="w-full h-14 bg-primary text-on-primary font-label-lg font-bold rounded-xl shadow-md mt-2">
                Guardar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVITAR ALUMNO */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-3xl rounded-b-none border-b-0 p-6 pb-safe flex flex-col gap-4 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm font-bold gradient-text">Invitar Alumno</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="w-8 h-8 bg-surface-container rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-2">Ingresa el correo del alumno. Solo podrá registrarse y acceder a la academia si su correo está en esta lista de invitados.</p>
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
    </div>
  );
}
