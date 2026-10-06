"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DisponibilidadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [classTypes, setClassTypes] = useState<string[]>([]);
  
  // Default to today
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    fecha: today,
    hora_inicio: "10:00",
    nombre_clase: "",
    sala: "Sala Pole 1",
    descripcion: "Traer botella de agua, toalla personal y alcohol (magnesio líquido opcional)."
  });

  useEffect(() => {
    async function fetchClassTypes() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('tipos_clase')
        .select('nombre')
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        const uniqueClasses = data.map(c => c.nombre).filter(Boolean) as string[];
        setClassTypes(uniqueClasses);
        
        if (uniqueClasses.length > 0) {
          // Only update if current value is not in the new list, to avoid resetting on re-fetch
          setFormData(prev => uniqueClasses.includes(prev.nombre_clase) ? prev : { ...prev, nombre_clase: uniqueClasses[0] });
        } else {
          setFormData(prev => ({ ...prev, nombre_clase: "" }));
        }
      }
    }
    fetchClassTypes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!supabase) throw new Error("Supabase client is not configured");

      // Calcular fechas de forma segura para la zona horaria local
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const [hour, minute] = formData.hora_inicio.split(':').map(Number);
      const startDateTime = new Date(year, month - 1, day, hour, minute, 0);
      
      // Añadir 75 minutos
      const endDateTime = new Date(startDateTime.getTime() + 75 * 60000);

      // Obtener el ID del profesor (simulado buscando el primer profesor en la BD)
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'profesor')
        .limit(1)
        .single();

      if (profError || !profData) {
        throw new Error("No se pudo obtener el perfil de profesor de la base de datos.");
      }

      // Preparar payload
      const payload = {
        id_profesor: profData.id,
        nombre_clase: formData.nombre_clase,
        cupo_maximo: 8,
        cupos_inscritos: 0,
        fecha_hora_inicio: startDateTime.toISOString(),
        fecha_hora_fin: endDateTime.toISOString(),
        estado_clase: 'programada',
        sala: formData.sala,
        descripcion: formData.descripcion
      };

      // Intentar enviar a Supabase
      const { error } = await supabase.from('clase').insert([payload]);
      
      if (error) {
        throw new Error(`Error BD: ${error.message}`);
      }

      showToast("¡Clase publicada con éxito! Ya está disponible para reserva.");
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        hora_inicio: "12:00" 
      }));

    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Ocurrió un error al publicar la clase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <section className="px-gutter-mobile pt-space-lg">
        <div className="flex items-center gap-space-sm mb-1">
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">calendar_add_on</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Mis Horarios</h1>
            <p className="font-body-sm text-body-sm text-secondary">Publica tus clases para que los alumnos reserven.</p>
          </div>
        </div>
      </section>

      <section className="px-gutter-mobile mt-space-md">
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-surface-container shadow-lg rounded-3xl p-6 flex flex-col gap-6">
          
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">fitness_center</span>
              Tipo de Clase
            </label>
            <select 
              name="nombre_clase" 
              value={formData.nombre_clase}
              onChange={handleInputChange}
              disabled={classTypes.length === 0}
              className="w-full h-14 bg-surface-container-low border border-surface-container-highest rounded-xl px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-colors disabled:opacity-50"
            >
              {classTypes.length === 0 ? (
                <option value="" disabled>No hay tipos de clase disponibles</option>
              ) : (
                classTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                Fecha
              </label>
              <input 
                type="date" 
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                className="w-full h-14 bg-surface-container-low border border-surface-container-highest rounded-xl px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors [color-scheme:dark]"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                Hora Inicio
              </label>
              <input 
                type="time" 
                name="hora_inicio"
                value={formData.hora_inicio}
                onChange={handleInputChange}
                className="w-full h-14 bg-surface-container-low border border-surface-container-highest rounded-xl px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">meeting_room</span>
              Sala
            </label>
            <select 
              name="sala" 
              value={formData.sala}
              onChange={handleInputChange}
              className="w-full h-14 bg-surface-container-low border border-surface-container-highest rounded-xl px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-colors"
            >
              <option value="Sala Pole 1">Sala Pole 1 (Cap: 8)</option>
              <option value="Sala Pole Principal">Sala Pole Principal (Cap: 8)</option>
              <option value="Sala Multiuso">Sala Multiuso</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">list_alt</span>
              Indicaciones Adicionales
            </label>
            <textarea 
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-4 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
            ></textarea>
          </div>

          {/* Resumen Automático */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-2">
            <h3 className="font-label-md text-label-md text-primary font-bold mb-2">Resumen de la Clase</h3>
            <ul className="flex flex-col gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span>Duración fija de <strong>75 minutos</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span>Cupo máximo establecido en <strong>8 alumnos</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span>Visibilidad inmediata para reservas en App Alumno.</span>
              </li>
            </ul>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || classTypes.length === 0}
            className="w-full h-14 mt-4 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-[24px]">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">publish</span>
            )}
            {isSubmitting ? "Publicando..." : "Publicar Clase"}
          </button>
        </form>
      </section>

      {/* Toast Notification */}
      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-surface-container-highest border border-surface-container-high text-on-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md w-full">
          <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
          <span className="font-label-md text-label-md leading-tight flex-1">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
