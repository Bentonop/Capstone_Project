"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PerfilProfesorPage() {
  const [profile, setProfile] = useState<any>(null);
  const [clases, setClases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    especialidad: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      if (!supabase) return;
      
      // Get current mock teacher
      const { data: user } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "profesor")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
        
      if (user) {
        setProfile(user);
        setFormData({
          bio: user.bio || "",
          especialidad: user.especialidad || ""
        });

        // Fetch their classes
        const { data: susClases } = await supabase
          .from("clase")
          .select("*")
          .eq("id_profesor", user.id)
          .gte("fecha_hora_inicio", new Date().toISOString())
          .order("fecha_hora_inicio", { ascending: true });
          
        if (susClases) setClases(susClases);
      }
    } catch (err) {
      console.error("Error fetching", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: formData.bio,
          especialidad: formData.especialidad
        })
        .eq("id", profile.id);
        
      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving", err);
      alert("Error al guardar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 p-8 text-center text-on-surface-variant font-body-lg">
        Perfil no encontrado.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full animate-in fade-in duration-300">
      
      {/* Cover Image Placeholder */}
      <div className="h-32 bg-gradient-to-r from-primary-container to-secondary-container relative">
         <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-on-primary text-4xl font-bold shadow-xl border-4 border-background">
               {profile.name?.charAt(0)}{profile.last_name?.charAt(0)}
            </div>
         </div>
      </div>

      <div className="px-6 pt-16 pb-8 flex flex-col gap-6">
        
        {/* Header Info */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start">
             <div>
               <h1 className="font-headline-md text-on-surface font-bold">
                 {profile.name} {profile.last_name}
               </h1>
               {!isEditing ? (
                 <span className="font-label-lg text-primary block mt-1">
                   {profile.especialidad || "Especialidad no configurada"}
                 </span>
               ) : (
                 <input
                   type="text"
                   placeholder="Ej: Experto en Pole Dance"
                   value={formData.especialidad}
                   onChange={e => setFormData({...formData, especialidad: e.target.value})}
                   className="w-full bg-surface-container p-2 rounded mt-2 font-label-md border border-surface-container-high focus:outline-primary"
                 />
               )}
             </div>
             
             {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center hover:bg-surface-container transition-colors shadow-sm">
                  <span className="material-symbols-outlined">edit</span>
                </button>
             ) : (
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold shadow-sm disabled:opacity-50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Guardar
                </button>
             )}
          </div>
        </div>

        {/* Biografía */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
           <h2 className="font-headline-sm text-on-surface mb-3 flex items-center gap-2">
             <span className="material-symbols-outlined text-primary">person_book</span>
             Biografía
           </h2>
           {!isEditing ? (
             <p className="font-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">
               {profile.bio || "Aún no has escrito una biografía. Cuéntales a tus alumnos sobre ti, tu experiencia y estilo de enseñanza."}
             </p>
           ) : (
             <textarea
               rows={4}
               placeholder="Escribe un poco sobre tu trayectoria..."
               value={formData.bio}
               onChange={e => setFormData({...formData, bio: e.target.value})}
               className="w-full bg-surface-container p-3 rounded-lg font-body-md border border-surface-container-high focus:outline-primary resize-none"
             />
           )}
        </section>

         {/* Panel de Clases */}
        <section className="mt-4">
           <h2 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
             <span className="material-symbols-outlined text-primary">category</span>
             Clases que imparto
           </h2>
           
           {clases.length === 0 ? (
             <div className="p-6 bg-surface-container-low rounded-xl text-center text-on-surface-variant font-body-sm border border-surface-container">
                No tienes clases programadas próximamente.
             </div>
           ) : (
             <div className="flex flex-wrap gap-3">
               {Array.from(new Set(clases.map(c => c.nombre_clase))).map(clsName => {
                 return (
                   <Link 
                     href={`/alumno/explorar?filtro=${encodeURIComponent(clsName)}`}
                     key={clsName} 
                     className="px-4 py-2.5 bg-surface-container-lowest border border-surface-container shadow-sm rounded-full font-label-lg font-bold text-on-surface flex items-center gap-2 hover:bg-surface-container-high transition-colors active:scale-95"
                   >
                      <span className="material-symbols-outlined text-[18px] text-primary">local_fire_department</span>
                      {clsName}
                   </Link>
                 );
               })}
             </div>
           )}
        </section>


      </div>
    </div>
  );
}
