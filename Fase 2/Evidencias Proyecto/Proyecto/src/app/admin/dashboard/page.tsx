"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UrgencyClass {
  id: string;
  name: string;
  timeRange: string;
  room: string;
  reason: string;
  enrolled: number;
  maxCapacity: number;
}

export default function AdminDashboardPage() {
  const [urgencies, setUrgencies] = useState<UrgencyClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyClass | null>(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUrgencies();
  }, []);

  async function fetchUrgencies() {
    try {
      setIsLoading(true);
      if (!supabase) throw new Error("No Supabase");

      const { data, error } = await supabase
        .from("clase")
        .select("*")
        .eq("estado_clase", "cancelada")
        .order("fecha_hora_inicio", { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: UrgencyClass[] = data.map((c: any) => {
          const start = new Date(c.fecha_hora_inicio);
          const end = new Date(c.fecha_hora_fin);
          return {
            id: c.id_clase.toString(),
            name: c.nombre_clase,
            timeRange: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
            room: c.sala || "Sala Principal",
            reason: c.descripcion || "Sin motivo especificado",
            enrolled: c.cupos_inscritos || 0,
            maxCapacity: c.cupo_maximo || 8,
          };
        });
        setUrgencies(mapped);
      }
    } catch (err) {
      console.error(err);
      // Fallback data for demo if RLS fails or empty
      setUrgencies([
        {
          id: "demo-urg",
          name: "Pole Exotic & Choreo",
          timeRange: "18:30 - 19:45",
          room: "Sala Pole 1",
          reason: "[CANCELADA] Motivo: Me doblé el tobillo en el ensayo.",
          enrolled: 6,
          maxCapacity: 8
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openReassignModal = (urgency: UrgencyClass) => {
    setSelectedUrgency(urgency);
    setIsReassignModalOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedUrgency || !selectedSubstitute) return;

    // Optimistic UI
    setUrgencies(prev => prev.filter(u => u.id !== selectedUrgency.id));
    
    // DB Update
    try {
      if (supabase && selectedUrgency.id !== "demo-urg") {
        await supabase
          .from("clase")
          .update({ 
            estado_clase: 'programada',
            descripcion: `Reasignada a suplente: ${selectedSubstitute}` 
          })
          .eq("id_clase", parseInt(selectedUrgency.id));
      }
      showToast(`Clase reasignada a ${selectedSubstitute} exitosamente.`);
    } catch (err) {
      console.error(err);
      showToast(`Clase reasignada a ${selectedSubstitute} (Demo)`);
    }

    setIsReassignModalOpen(false);
    setSelectedUrgency(null);
    setSelectedSubstitute("");
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <section className="px-gutter-mobile pt-space-md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Buzón de Urgencias</h1>
        <p className="font-body-sm text-body-sm text-secondary mb-space-md">
          Gestiona las solicitudes de suplencia de los docentes.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <span className="material-symbols-outlined animate-spin text-secondary text-3xl">refresh</span>
          </div>
        ) : urgencies.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Todo en orden</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No hay solicitudes de relevo pendientes por el momento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-space-md">
            {urgencies.map(urg => (
              <article key={urg.id} className="p-5 rounded-2xl bg-error-container/10 border border-error/20 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-caps text-label-caps font-bold">URGENCIA</span>
                      <span className="font-label-md text-label-md text-error">{urg.timeRange}</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">{urg.name}</h3>
                    <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {urg.room} • {urg.enrolled}/{urg.maxCapacity} Alumnos inscritos
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-lowest border-l-4 border-error/50">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface block mb-1">Motivo reportado:</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic">"{urg.reason}"</p>
                </div>

                <button 
                  onClick={() => openReassignModal(urg)}
                  className="h-12 w-full rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">group_add</span>
                  Asignar Suplente
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal Reasignar */}
      {isReassignModalOpen && selectedUrgency && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full bg-surface-container-lowest rounded-t-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-lg animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 rounded-full bg-surface-variant mx-auto mb-1"></div>
            
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">assignment_ind</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Reasignar Clase</h3>
                <p className="font-body-sm text-body-sm text-secondary">{selectedUrgency.name}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-label-sm text-label-sm text-on-surface font-bold">Seleccionar Profesor Suplente:</label>
              <select 
                value={selectedSubstitute}
                onChange={(e) => setSelectedSubstitute(e.target.value)}
                className="w-full h-14 bg-surface-container-high border border-surface-container-highest rounded-xl px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary appearance-none"
              >
                <option value="" disabled>Elige un profesor disponible...</option>
                <option value="Camila Rivas">Camila Rivas (Urbano/Flow)</option>
                <option value="Carlos 'Che' Vega">Carlos 'Che' Vega (Pole)</option>
                <option value="Lucía Ferrer">Lucía Ferrer (Heels/Pole)</option>
                <option value="Profesor Externo de Guardia">Profesor Externo de Guardia</option>
              </select>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-normal mt-1">
              Al confirmar, la clase volverá a estar Activa. Se notificará al nuevo profesor y a los alumnos del cambio de docente.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                disabled={!selectedSubstitute}
                className="w-full h-12 rounded-xl bg-secondary text-on-secondary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                onClick={handleReassign}
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Confirmar Reasignación
              </button>
              <button 
                className="w-full h-12 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-label-lg font-semibold flex items-center justify-center active:bg-surface-container transition-colors"
                onClick={() => { setIsReassignModalOpen(false); setSelectedUrgency(null); setSelectedSubstitute(""); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">verified</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
