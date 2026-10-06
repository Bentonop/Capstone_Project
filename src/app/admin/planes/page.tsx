"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPlanesPage() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre_plan: "",
    descripcion: "",
    precio: "",
    creditos_clases: "",
    isUnlimited: false,
    duracion_dias: "30",
    disciplinas_incluidas: "Todas",
    estado: true
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  async function fetchPlanes() {
    try {
      setIsLoading(true);
      if (!supabase) return;
      const { data, error } = await supabase.from("planes").select("*").order("precio", { ascending: true });
      
      // If error occurs, it means table might not exist yet
      if (error) {
        console.error("Error fetching planes:", error);
        return;
      }
      
      setPlanes(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from("planes").insert([{
        nombre_plan: formData.nombre_plan,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        creditos_clases: formData.isUnlimited ? 9999 : parseInt(formData.creditos_clases),
        duracion_dias: parseInt(formData.duracion_dias),
        disciplinas_incluidas: formData.disciplinas_incluidas,
        estado: formData.estado
      }]).select();

      if (error) throw error;

      showToast("Plan creado exitosamente");
      setIsModalOpen(false);
      setFormData({
        nombre_plan: "",
        descripcion: "",
        precio: "",
        creditos_clases: "",
        isUnlimited: false,
        duracion_dias: "30",
        disciplinas_incluidas: "Todas",
        estado: true
      });
      fetchPlanes();
    } catch (error) {
      console.error("Error al crear plan:", error);
      alert("Error al guardar el plan. ¿Creaste la tabla en Supabase?");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("planes").update({ estado: !currentStatus }).eq("id_plan", id);
      if (error) throw error;
      fetchPlanes();
    } catch (error) {
      console.error("Error toggling status", error);
    }
  };

  return (
    <div className="flex flex-col w-full pb-10 min-h-screen bg-surface">
      <header className="pt-safe pb-4 px-margin-mobile flex items-center justify-between sticky top-0 z-10 glass-panel border-x-0 border-t-0 rounded-none border-b border-surface-container shadow-sm">
        <h1 className="font-headline-md text-headline-md gradient-text font-bold">Planes y Tienda</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Crear Plan
        </button>
      </header>

      <div className="px-margin-mobile pt-space-md">
        <p className="font-body-sm text-on-surface-variant mb-6">
          Los planes configurados aquí aparecerán automáticamente en la pestaña "Tienda" de los alumnos. Controla precios, créditos y duración.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary">refresh</span></div>
        ) : planes.length === 0 ? (
          <div className="p-8 bg-surface-container-low border border-surface-container rounded-2xl flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[48px] text-secondary mb-3">storefront</span>
            <h3 className="font-headline-sm text-on-surface">No hay planes creados</h3>
            <p className="font-body-sm text-on-surface-variant mt-1 mb-4">Crea tu primer plan para que los alumnos puedan adquirir créditos.</p>
            <button onClick={() => setIsModalOpen(true)} className="h-12 px-6 rounded-xl bg-primary text-on-primary font-label-md font-bold">Crear Plan</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map(plan => (
              <div key={plan.id_plan} className={`p-5 rounded-2xl border flex flex-col gap-3 shadow-sm ${plan.estado ? 'bg-surface-container-lowest border-primary/20' : 'bg-surface-container-low border-surface-container opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <h3 className="font-headline-sm text-on-surface leading-tight max-w-[80%]">{plan.nombre_plan}</h3>
                  <button onClick={() => toggleStatus(plan.id_plan, plan.estado)} className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${plan.estado ? 'bg-emerald-500 justify-end' : 'bg-surface-container-highest justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                  </button>
                </div>
                
                <div className="flex items-end gap-2 border-b border-surface-container pb-2">
                  <span className="font-headline-md font-bold text-primary">${plan.precio.toLocaleString()}</span>
                  <span className="font-body-sm text-secondary mb-1">/ {plan.duracion_dias} días</span>
                </div>
                
                <div className="flex flex-col gap-1 mt-1 font-body-sm text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">database</span>
                    <span>{plan.creditos_clases} Créditos de Clases</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">fitness_center</span>
                    <span>{plan.disciplinas_incluidas}</span>
                  </div>
                </div>
                
                <p className="font-body-sm italic text-secondary mt-1 border-t border-surface-container pt-2 line-clamp-2">
                  "{plan.descripcion}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto pb-safe-offset-24 sm:pb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-sm font-bold gradient-text">Nuevo Plan / Paquete</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm font-bold text-on-surface">Nombre del Plan</label>
                <input required type="text" value={formData.nombre_plan} onChange={(e) => setFormData({...formData, nombre_plan: e.target.value})} placeholder="Ej. Pilates Premium" className="h-12 px-4 rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="font-label-sm font-bold text-on-surface">Precio ($)</label>
                  <input required type="number" value={formData.precio} onChange={(e) => setFormData({...formData, precio: e.target.value})} placeholder="79000" className="h-12 px-4 rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5 w-5/12">
                  <label className="font-label-sm font-bold text-on-surface">Créditos</label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      required={!formData.isUnlimited}
                      disabled={formData.isUnlimited}
                      type={formData.isUnlimited ? "text" : "number"} 
                      value={formData.isUnlimited ? "∞" : formData.creditos_clases} 
                      onChange={(e) => setFormData({...formData, creditos_clases: e.target.value})} 
                      placeholder="8" 
                      className={`h-12 w-full px-3 rounded-xl border bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-center ${formData.isUnlimited ? 'border-primary/50 text-primary font-bold text-xl' : 'border-surface-container-highest'}`} 
                    />
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isUnlimited: !formData.isUnlimited, creditos_clases: ""})}
                      className={`h-12 w-12 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all ${formData.isUnlimited ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant border-surface-container-highest hover:bg-surface-container'}`}
                      title="Plan Ilimitado"
                    >
                      <span className="material-symbols-outlined text-[20px]">all_inclusive</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm font-bold text-on-surface">Duración (Días de vigencia)</label>
                <select required value={formData.duracion_dias} onChange={(e) => setFormData({...formData, duracion_dias: e.target.value})} className="h-12 px-4 rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary appearance-none">
                  <option value="30">30 Días (Mensual)</option>
                  <option value="90">90 Días (Trimestral)</option>
                  <option value="365">365 Días (Anual)</option>
                  <option value="1">1 Día (Clase Suelta)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm font-bold text-on-surface">Disciplinas Incluidas</label>
                <input required type="text" value={formData.disciplinas_incluidas} onChange={(e) => setFormData({...formData, disciplinas_incluidas: e.target.value})} placeholder="Ej. Todas las clases de Pole" className="h-12 px-4 rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary" />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm font-bold text-on-surface">Descripción / Beneficios</label>
                <textarea required value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} placeholder="Plan de 2 clases a la semana..." rows={3} className="p-3 rounded-xl border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary resize-none"></textarea>
              </div>

              <div className="pb-16 sm:pb-0">
                <button type="submit" className="h-14 mt-4 w-full rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center justify-center shadow-sm">
                  Guardar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 flex items-center justify-center animate-in slide-in-from-top-4">
          <div className="bg-surface-container-highest text-on-surface px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            <span className="font-label-md font-bold">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
