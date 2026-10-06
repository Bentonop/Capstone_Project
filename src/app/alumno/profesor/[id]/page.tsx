"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfesorPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const idProfesor = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [clases, setClases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [idProfesor]);

  async function fetchData() {
    try {
      if (!supabase || !idProfesor) return;
      
      const { data: user } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", idProfesor)
        .single();
        
      if (user) {
        setProfile(user);

        // Fetch their classes
        const { data: susClases } = await supabase
          .from("clase")
          .select("*")
          .eq("id_profesor", user.id)
          .gte("fecha_hora_inicio", new Date().toISOString())
          .order("fecha_hora_inicio", { ascending: true })
          .limit(10);
          
        if (susClases) setClases(susClases);
      }
    } catch (err) {
      console.error("Error fetching", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 p-8 text-center text-on-surface-variant font-body-lg min-h-screen flex items-center justify-center flex-col gap-4 bg-background">
        Perfil no encontrado.
        <button onClick={() => router.back()} className="text-primary font-bold underline">Volver atrás</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface pb-bottom-nav-safe animate-in fade-in duration-300 relative">
      
      {/* Top Navbar / Back Button */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-surface/40 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      {/* Cover Image Placeholder */}
      <div className="h-48 bg-gradient-to-r from-primary to-primary-container relative">
         <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
            <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-on-primary text-5xl font-bold shadow-xl border-4 border-surface">
               {profile.name?.charAt(0)}{profile.last_name?.charAt(0)}
            </div>
         </div>
      </div>

      <div className="px-6 pt-20 pb-8 flex flex-col gap-8 flex-1 bg-surface rounded-t-3xl -mt-4 relative z-0">
        
        {/* Header Info */}
        <div className="flex flex-col items-center text-center">
           <h1 className="font-headline-md text-on-surface font-black">
             {profile.name} {profile.last_name}
           </h1>
           <span className="font-label-lg text-primary font-bold uppercase tracking-widest mt-1">
             {profile.especialidad || "Docente"}
           </span>
        </div>

        {/* Biografía */}
        <div className="flex flex-col gap-3">
           <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
             <span className="material-symbols-outlined text-primary text-[20px]">psychiatry</span>
             Acerca de mí
           </h2>
           <p className="font-body-lg text-on-surface-variant leading-relaxed">
             {profile.bio || "Este profesor aún no ha publicado su biografía."}
           </p>
        </div>

        {/* Panel de Clases (Pills) */}
        <div className="flex flex-col gap-4 mt-2">
           <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
             <span className="material-symbols-outlined text-primary text-[20px]">category</span>
             Especialidades
           </h2>
           
           {clases.length === 0 ? (
             <div className="p-6 bg-surface-container-low rounded-2xl text-center flex flex-col items-center justify-center border border-surface-container border-dashed">
                <span className="material-symbols-outlined text-[32px] text-surface-container-highest mb-2">event_busy</span>
                <span className="text-on-surface-variant font-body-md font-medium">Sin clases registradas</span>
             </div>
           ) : (
             <div className="flex flex-wrap gap-2">
               {Array.from(new Set(clases.map(c => c.nombre_clase))).map(className => (
                 <button
                   key={className}
                   onClick={() => router.push(`/alumno/explorar?filtro=${encodeURIComponent(className)}&search=${encodeURIComponent(profile.name)}`)}
                   className="px-4 py-2 bg-primary-container text-on-primary-container font-label-md font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-1.5 border border-primary/20 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-[18px]">bolt</span>
                   {className}
                 </button>
               ))}
             </div>
           )}
           <p className="font-body-sm text-on-surface-variant mt-2 px-1">
             Toca una disciplina para buscar las próximas sesiones en el calendario.
           </p>
        </div>

      </div>
    </div>
  );
}
