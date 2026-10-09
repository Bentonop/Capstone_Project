"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AlumnoPerfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    contacto_emergencia: "",
    condicion_medica: "",
    phone: "",
    correo: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      try {
        if (!supabase) throw new Error("No Supabase Client");
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setProfile(data);
          setFormData({
            contacto_emergencia: data.contacto_emergencia || "",
            condicion_medica: data.condicion_medica || "",
            phone: data.phone || "",
            correo: data.correo || ""
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile || !supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", profile.id);
        
      if (error) throw error;
      
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile", err);
      alert("Error al guardar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("¿Estás segura de que quieres eliminar tu cuenta permanentemente? Perderás todos tus planes y reservas.")) {
      alert("Tu cuenta ha sido eliminada del sistema.");
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  return (
    <div className="flex flex-col w-full pb-bottom-nav-safe">
      <div className="flex items-center px-margin-mobile pt-space-md pb-space-sm gap-3">
        <h1 className="font-headline-md text-[24px] text-on-surface font-bold">Mi Perfil</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 mt-10">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
        </div>
      ) : profile ? (
        <div className="flex flex-col px-margin-mobile gap-space-lg mt-space-sm">
          {/* Header Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col items-center justify-center relative overflow-hidden">
             <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-on-primary text-4xl font-bold shadow-md mb-4 relative">
                {profile.name?.charAt(0)}{profile.last_name?.charAt(0)}
             </div>
             <h2 className="font-headline-sm text-on-surface text-xl">{profile.name} {profile.last_name}</h2>
             <span className="font-label-md text-secondary mt-1 uppercase tracking-wider">{profile.role}</span>
             <div className="mt-4 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm font-bold shadow-sm">
               Cuenta Activa
             </div>
          </section>

          {/* Details */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-headline-sm text-on-surface">Información Personal</h3>
              {isEditing && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-secondary font-label-sm font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-primary font-label-sm font-bold disabled:opacity-50"
                  >
                    {isSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div className="flex flex-col w-full">
                <span className="font-label-sm text-secondary uppercase">RUT</span>
                <span className="font-body-lg text-on-surface font-medium">{profile.rut || "No registrado"}</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <div className="flex flex-col w-full overflow-hidden">
                <span className="font-label-sm text-secondary uppercase">Correo Electrónico</span>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={formData.correo} 
                    onChange={e => setFormData({...formData, correo: e.target.value})} 
                    className="w-full bg-surface-container p-2 rounded mt-1 font-body-md border border-surface-container-high focus:outline-primary"
                    placeholder="correo@ejemplo.com"
                  />
                ) : (
                  <span className="font-body-lg text-on-surface font-medium truncate">{profile.correo || "No registrado"}</span>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </div>
              <div className="flex flex-col w-full">
                <span className="font-label-sm text-secondary uppercase">Teléfono</span>
                {isEditing ? (
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full bg-surface-container p-2 rounded mt-1 font-body-md border border-surface-container-high focus:outline-primary"
                    placeholder="+56 9..."
                  />
                ) : (
                  <span className="font-body-lg text-on-surface font-medium">{profile.phone || "No registrado"}</span>
                )}
              </div>
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error shrink-0">
                <span className="material-symbols-outlined text-[20px]">medical_information</span>
              </div>
              <div className="flex flex-col w-full">
                <span className="font-label-sm text-secondary uppercase">Condición Médica</span>
                {isEditing ? (
                  <textarea 
                    value={formData.condicion_medica} 
                    onChange={e => setFormData({...formData, condicion_medica: e.target.value})} 
                    className="w-full bg-surface-container p-2 rounded mt-1 font-body-md border border-surface-container-high focus:outline-primary min-h-[60px]"
                    placeholder="Escribe aquí alergias, lesiones, etc."
                  />
                ) : (
                  <span className="font-body-md text-on-surface font-medium">{profile.condicion_medica || "Ninguna (Apto para actividad física)"}</span>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">emergency_home</span>
              </div>
              <div className="flex flex-col w-full">
                <span className="font-label-sm text-secondary uppercase">Contacto de Emergencia</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.contacto_emergencia} 
                    onChange={e => setFormData({...formData, contacto_emergencia: e.target.value})} 
                    className="w-full bg-surface-container p-2 rounded mt-1 font-body-md border border-surface-container-high focus:outline-primary"
                    placeholder="Nombre y Parentesco"
                  />
                ) : (
                  <span className="font-body-md text-on-surface font-medium">{profile.contacto_emergencia || "No registrado"}</span>
                )}
                {!isEditing && <span className="font-body-sm text-secondary mt-0.5">{profile.phone || "Sin teléfono"}</span>}
              </div>
            </div>

            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full h-12 mt-2 rounded-xl border-2 border-primary text-primary font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                Modificar Datos
              </button>
            )}
          </section>
          
          <div className="pt-4 pb-8 flex flex-col gap-3">
            <button className="w-full h-12 rounded-xl bg-surface-container-high text-on-surface font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Configuración de la cuenta
            </button>
            <button 
              onClick={handleDeleteAccount}
              className="w-full h-12 rounded-xl bg-error/10 text-error font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-error/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              Borrar Cuenta
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-error/10 text-error hover:bg-error/20 active:scale-[0.98] transition-all font-label-lg font-bold"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-2xl border border-surface-container mt-10 text-center mx-4">
          <span className="material-symbols-outlined text-secondary text-4xl mb-3">person_off</span>
          <h3 className="font-headline-sm text-on-surface">Perfil no encontrado</h3>
          <p className="font-body-sm text-on-surface-variant mt-1">No hay alumnos registrados en la base de datos.</p>
        </div>
      )}
    </div>
  );
}
