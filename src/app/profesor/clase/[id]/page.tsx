"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import QrScanner from "@/components/shared/QrScanner";

type StudentStatus = "presente" | "pendiente" | "cancelado";

interface Student {
  id: number;
  reserva_id: number;
  name: string;
  plan: string;
  status: StudentStatus;
  time: string | null;
  type: string;
  isNew: boolean;
  emergencyContact: string;
  emergencyPhone: string;
  healthConditions: string | null;
}

export default function ProfesorClasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [qrMode, setQrMode] = useState<"scan" | "display">("scan");
  const [students, setStudents] = useState<Student[]>([]);
  const [claseDetalle, setClaseDetalle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    async function fetchClaseData() {
      if (!supabase) return;
      
      const { data: claseData } = await supabase
        .from('clase')
        .select('*')
        .eq('id_clase', id)
        .single();
        
      if (claseData) setClaseDetalle(claseData);

      const { data: reservas } = await supabase
        .from('reserva')
        .select(`
           *,
           profiles:id_usuario (id, name, last_name, phone, contacto_emergencia, condicion_medica),
           asistencia (*)
        `)
        .eq('id_clase', id);

      if (reservas) {
        const mappedStudents: Student[] = reservas.map(r => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const tieneAsistencia = r.asistencia && r.asistencia.length > 0 && r.asistencia[0]?.fecha_hora_ingreso;

          return {
            id: r.id_usuario,
            reserva_id: r.id_reserva,
            name: `${profile?.name || ''} ${profile?.last_name || ''}`.trim() || 'Alumno',
            plan: "Plan Activo", 
            status: tieneAsistencia || r.estado_reserva === "presente" ? "presente" : (r.estado_reserva === "cancelada" ? "cancelado" : "pendiente"),
            time: tieneAsistencia ? new Date(r.asistencia[0].fecha_hora_ingreso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null,
            type: "normal",
            isNew: false,
            emergencyContact: profile?.contacto_emergencia || "No registrado",
            emergencyPhone: profile?.phone || "+56 9 0000 0000",
            healthConditions: profile?.condicion_medica || "Ninguna (Apto para actividad física)"
          };
        });
        setStudents(mappedStudents);
      }
      setIsLoading(false);
    }
    
    fetchClaseData();
  }, [id]);

  const presentCount = students.filter(s => s.status === "presente").length;
  const totalCount = students.filter(s => s.status !== "cancelado").length;
  const progressPercent = totalCount === 0 ? 0 : (presentCount / totalCount) * 100;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Función interna para registrar asistencia en las tablas asistencia y reserva
  const registrarAsistenciaBD = async (reservaId: number, tokenUsado: string) => {
    if (!supabase) return;

    // 1. Guardar o actualizar registro en la tabla asistencia
    await supabase
      .from("asistencia")
      .upsert({
        id_reserva: reservaId,
        fecha_hora_ingreso: new Date().toISOString(),
        metodo_ingreso: "QR",
        token_qr_usado: tokenUsado
      }, { onConflict: 'id_reserva' });

    // 2. Actualizar estado en reserva
    await supabase
      .from("reserva")
      .update({ estado_reserva: "presente" })
      .eq("id_reserva", reservaId);
  };

  const handleSimulateScan = async () => {
    const pendingStudent = students.find(s => s.status === "pendiente");
    if (pendingStudent) {
      await registrarAsistenciaBD(pendingStudent.reserva_id, `simulacion-${pendingStudent.reserva_id}`);
      
      const updatedStudent = { ...pendingStudent, status: "presente" as StudentStatus, time: "Ahora" };
      setStudents(prev => prev.map(s => s.id === pendingStudent.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent);
      showToast(`Ingresó: ${pendingStudent.name}. Revisa sus datos.`);
    } else {
      showToast("No hay alumnos pendientes para escanear");
    }
  };

  const handleScanResult = async (decodedText: string) => {
    let targetReservaId: number | null = null;
    let targetClaseId: number | null = null;

    try {
      const parsed = JSON.parse(decodedText);
      targetReservaId = Number(parsed.id_reserva);
      targetClaseId = Number(parsed.id_clase);
    } catch {
      targetReservaId = Number(decodedText) || null;
    }

    if (targetClaseId && String(targetClaseId) !== String(id)) {
      showToast("Este código QR pertenece a otra clase.");
      return;
    }

    const student = students.find(s => 
      (targetReservaId && s.reserva_id === targetReservaId) || 
      s.id.toString() === decodedText || 
      s.reserva_id.toString() === decodedText || 
      s.name.toLowerCase() === decodedText.toLowerCase()
    );
    
    if (student) {
      if (student.status === "pendiente") {
        await registrarAsistenciaBD(student.reserva_id, decodedText);

        const updatedStudent = { ...student, status: "presente" as StudentStatus, time: "Ahora" };
        setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        showToast(`QR Exitoso: ${student.name}`);
      } else if (student.status === "presente") {
        showToast(`${student.name} ya está presente.`);
      }
    } else {
      console.log("QR no reconocido o alumno no encontrado:", decodedText);
      showToast("QR no válido o alumno no inscrito.");
    }
  };

  const handleCheckIn = async (studentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const student = students.find(s => s.id === studentId);
    if (!student || !supabase) return;

    await registrarAsistenciaBD(student.reserva_id, `manual-${student.reserva_id}`);

    const updatedStudent = { ...student, status: "presente" as StudentStatus, time: "Ahora" };
    setStudents(prev => 
      prev.map(s => s.id === studentId ? updatedStudent : s)
    );
    setSelectedStudent(updatedStudent);
    showToast(`Ingresó: ${student.name}. Revisa sus datos.`);
  };

  const submitIncident = (type: string) => {
    setIsIncidentModalOpen(false);
    showToast(`Aviso enviado: ${type}`);
  };

  const handleStartClass = async () => {
    if (!supabase || !claseDetalle) return;
    try {
      const { error: updateError } = await supabase
        .from('clase')
        .update({ estado_clase: 'en_curso' })
        .eq('id_clase', id);

      if (updateError) throw updateError;
      
      setClaseDetalle({ ...claseDetalle, estado_clase: 'en_curso' });

      const tituloNotificacion = `🟢 Clase Iniciada: ${claseDetalle.nombre_clase}`;
      const mensajeNotificacion = `El profesor ha iniciado la sesión. Asistencia confirmada: ${presentCount}/${totalCount} alumnos.`;
      
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert([{
          tipo: 'operativa',
          titulo: tituloNotificacion,
          mensaje: mensajeNotificacion,
          clase_id: parseInt(id)
        }]);
        
      if (notifError) console.warn("La tabla de notificaciones podría no estar lista aún:", notifError);

      showToast("✅ Clase iniciada correctamente. Administrador notificado.");
    } catch (err) {
      console.error("Error al iniciar clase:", err);
      showToast("❌ Hubo un error al iniciar la clase");
    }
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <button 
              aria-label="Volver" 
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors"
              onClick={() => router.back()}
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold text-[10px] text-on-primary">
              CA
            </div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight truncate max-w-[200px] ml-2">Detalle De Clase</h1>
          </div>
          <div className="flex items-center gap-space-xs">
             <div className="w-8 h-8 rounded-full bg-surface-container-high shadow-sm flex items-center justify-center text-primary font-bold text-xs">MS</div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-safe bg-surface min-h-screen">
        <div className="flex flex-col w-full pb-10">
          
          <section className="px-margin-mobile pt-space-xs pb-space-sm">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container/50">
              <div className="flex items-start justify-between gap-space-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-space-2xs mb-1">
                    {claseDetalle?.estado_clase === 'en_curso' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-label-caps text-label-caps border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        EN CURSO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-caps text-label-caps border border-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        PROGRAMADA
                      </span>
                    )}
                    <span className="text-secondary font-label-caps text-label-caps uppercase tracking-wider ml-2">{claseDetalle?.sala || "Sala Pole 1"}</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface truncate">{claseDetalle?.nombre_clase || "Cargando..."}</h2>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {claseDetalle ? new Date(claseDetalle.fecha_hora_inicio).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute:'2-digit' }) : ""} hrs
                  </p>
                  <div className="mt-3 text-secondary font-body-sm text-body-sm bg-surface-container/50 p-2.5 rounded-lg border border-surface-container-high">
                    <p className="font-bold flex items-center gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                      Recordatorio a alumnos:
                    </p>
                    <p className="mt-1">Traer botella de agua, toalla personal y alcohol (magnesio líquido opcional).</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-space-md pt-space-sm border-t border-surface-container">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">group_check</span>
                    <span className="font-label-lg text-label-lg text-on-surface">Asistencia</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-primary">
                    <span>{presentCount}</span><span className="text-secondary text-body-md font-body-md">/{totalCount}</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(212,175,55,0.6)]" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="flex items-center justify-between mt-2 font-label-caps text-label-caps text-secondary">
                  <span>{Math.round(progressPercent)}% Completado</span>
                  <span className="text-on-surface-variant">
                    {totalCount - presentCount} pendientes • {students.length - totalCount} cancelados
                  </span>
                </div>
              </div>

              {claseDetalle?.estado_clase !== 'en_curso' && (
                <div className="mt-4 pt-4 border-t border-surface-container">
                  <button 
                    onClick={handleStartClass}
                    className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    Comenzar Clase
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="px-margin-mobile py-space-xs">
            <div className="premium-card/50 rounded-2xl p-space-md shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Validación de Ingreso</h3>
                    <p className="font-body-sm text-body-sm text-secondary">Control automático de acceso</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 p-1 bg-surface-container rounded-xl gap-1 mb-space-md border border-surface-container-high">
                <button 
                  className={`py-2.5 px-2 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${qrMode === 'scan' ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold' : 'text-secondary hover:text-on-surface font-normal'}`}
                  onClick={() => setQrMode("scan")}
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  Escanear
                </button>
                <button 
                  className={`py-2.5 px-2 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${qrMode === 'display' ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold' : 'text-secondary hover:text-on-surface font-normal'}`}
                  onClick={() => setQrMode("display")}
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                  Mostrar QR
                </button>
              </div>

              {qrMode === "scan" ? (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[280px]">
                    <QrScanner onResult={handleScanResult} />
                  </div>
                  <div className="flex items-center justify-between w-full mt-space-sm pt-space-xs text-secondary font-body-sm text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                      Detección instantánea
                    </span>
                    <button className="text-primary font-label-md text-label-md underline hover:text-primary-fixed-variant" onClick={handleSimulateScan}>
                      Simular Pase
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <div className="p-5 bg-surface-container rounded-2xl shadow-inner border border-surface-container-high flex flex-col items-center w-full">
                    <div className="w-52 h-52 bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
                      <svg className="w-full h-full" fill="#1b1c1b" viewBox="0 0 100 100">
                        <rect fill="#111625" height="28" rx="4" width="28" x="5" y="5"></rect>
                        <rect fill="#ffffff" height="20" rx="2" width="20" x="9" y="9"></rect>
                        <rect fill="#D4AF37" height="12" rx="1.5" width="12" x="13" y="13"></rect>
                        <rect fill="#111625" height="28" rx="4" width="28" x="67" y="5"></rect>
                        <rect fill="#ffffff" height="20" rx="2" width="20" x="71" y="9"></rect>
                        <rect fill="#D4AF37" height="12" rx="1.5" width="12" x="75" y="13"></rect>
                        <rect fill="#111625" height="28" rx="4" width="28" x="5" y="67"></rect>
                        <rect fill="#ffffff" height="20" rx="2" width="20" x="9" y="71"></rect>
                        <rect fill="#D4AF37" height="12" rx="1.5" width="12" x="13" y="75"></rect>
                        <rect height="6" rx="1" width="6" x="38" y="8"></rect>
                        <rect height="5" rx="1" width="8" x="48" y="14"></rect>
                        <rect height="6" rx="1" width="16" x="40" y="24"></rect>
                        <rect height="8" rx="1" width="8" x="10" y="40"></rect>
                        <rect height="6" rx="1" width="12" x="22" y="44"></rect>
                        <rect height="6" rx="1" width="10" x="8" y="54"></rect>
                        <rect fill="#D4AF37" height="16" rx="3" width="16" x="42" y="38"></rect>
                        <circle cx="50" cy="46" fill="#ffffff" r="3"></circle>
                        <rect height="6" rx="1" width="8" x="68" y="38"></rect>
                        <rect height="8" rx="1" width="10" x="82" y="42"></rect>
                        <rect height="6" rx="1" width="18" x="72" y="52"></rect>
                        <rect height="12" rx="1" width="6" x="38" y="66"></rect>
                        <rect height="6" rx="1" width="14" x="48" y="74"></rect>
                        <rect height="8" rx="1" width="18" x="40" y="86"></rect>
                        <rect height="8" rx="1" width="8" x="68" y="68"></rect>
                        <rect height="6" rx="1" width="10" x="82" y="72"></rect>
                        <rect height="8" rx="1" width="18" x="74" y="84"></rect>
                      </svg>
                    </div>
                    <div className="text-center mt-4">
                      <span className="font-headline-sm text-headline-sm text-on-surface">Clase en Curso</span>
                      <p className="font-body-sm text-body-sm text-secondary mx-auto mt-1">Los alumnos pueden escanear este código desde su app para registrar asistencia.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="px-margin-mobile pt-space-md flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Róster de Alumnos</h3>
                <p className="font-body-sm text-body-sm text-secondary">{totalCount}/8 cupos ocupados</p>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs mt-1">
              {students.map((student) => (
                <div 
                  key={student.id} 
                  className={`rounded-xl p-space-sm flex flex-col gap-2 transition-all cursor-pointer ${student.status === 'cancelado' ? 'bg-surface-container/50 opacity-60 border border-transparent' : 'premium-card-high hover:border-primary/30'} ${selectedStudent?.id === student.id ? 'ring-1 ring-primary' : ''}`}
                  onClick={() => setSelectedStudent(selectedStudent?.id === student.id ? null : student)}
                >
                  <div className="flex items-center justify-between gap-space-xs">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className={`relative flex-shrink-0 ${student.status === 'cancelado' ? 'filter grayscale' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-on-surface-variant">
                          {student.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface-container-lowest flex items-center justify-center text-on-primary ${student.status === 'presente' ? 'bg-emerald-500' : student.status === 'pendiente' ? 'bg-primary' : 'bg-surface-container-highest text-on-surface'}`}>
                          <span className="material-symbols-outlined text-[10px] font-bold">
                            {student.status === 'presente' ? 'check' : student.status === 'pendiente' ? 'schedule' : 'close'}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-headline-sm text-headline-sm truncate ${student.status === 'cancelado' ? 'text-secondary line-through' : 'text-on-surface'}`}>{student.name}</h4>
                          {student.isNew && student.status !== 'cancelado' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">Nuevo</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-body-sm text-body-sm text-secondary truncate">{student.plan}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {student.status === "presente" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-label-md text-label-md border border-emerald-500/20">
                          <span className="material-symbols-outlined text-[14px]">done_all</span>
                          Presente
                        </span>
                      )}
                      {student.status === "cancelado" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high text-secondary font-label-caps text-label-caps">
                          Canceló
                        </span>
                      )}
                      {student.status === "pendiente" && (
                        <button 
                          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-primary/20"
                          onClick={(e) => handleCheckIn(student.id, e)}
                        >
                          <span className="material-symbols-outlined text-[16px]">touch_app</span>
                          <span className="">Marcar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedStudent?.id === student.id && student.status !== 'cancelado' && (
                    <div className="mt-2 pt-3 border-t border-surface-container flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                      {student.healthConditions && (
                        <div className="flex items-start gap-2 bg-error/10 text-error-container p-2 rounded-lg">
                          <span className="material-symbols-outlined text-[16px] text-error mt-0.5">medical_information</span>
                          <div>
                            <span className="font-label-md text-label-md text-error block">Condición médica indicada:</span>
                            <span className="font-body-sm text-body-sm">{student.healthConditions}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between bg-surface-container p-2.5 rounded-lg border border-surface-container-high">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined text-[16px]">emergency_home</span>
                          </div>
                          <div>
                            <span className="font-label-caps text-label-caps text-secondary block">Contacto Emergencia</span>
                            <span className="font-label-md text-label-md text-on-surface">{student.emergencyContact}</span>
                          </div>
                        </div>
                        <a href={`tel:${student.emergencyPhone}`} className="h-8 px-3 rounded-lg bg-surface-container-high hover:bg-primary/20 text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors border border-surface-container-highest hover:border-primary/30" onClick={e => e.stopPropagation()}>
                          <span className="material-symbols-outlined text-[16px]">call</span>
                          Llamar
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="px-margin-mobile pt-space-lg pb-space-md">
            <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-space-md flex flex-col gap-space-xs">
              <div className="flex items-start gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest text-secondary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Gestión de Urgencias</h4>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Comunica cualquier retraso o cambio a recepción central.
                  </p>
                </div>
              </div>
              <button 
                className="mt-space-xs w-full py-3 px-4 rounded-xl border border-surface-container-highest text-secondary font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-surface-container active:scale-95 transition-all"
                onClick={() => setIsIncidentModalOpen(true)}
              >
                <span className="material-symbols-outlined text-[20px]">notification_important</span>
                Notificar Incidencia de Sala
              </button>
            </div>
          </section>

        </div>
      </main>

      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-surface-container-lowest border-t border-surface-container w-full max-w-lg rounded-t-3xl p-space-lg flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto mb-space-sm"></div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[24px]">report_problem</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Reportar Incidencia</h3>
              </div>
              <button className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface" onClick={() => setIsIncidentModalOpen(false)}>
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-secondary mb-space-md">
              Se enviará una alerta prioritaria a Dirección para cubrir o dar aviso a alumnos.
            </p>
            <div className="flex flex-col gap-space-xs mb-space-md">
              <button className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left flex items-center justify-between transition-colors" onClick={() => submitIncident('Retraso de sala')}>
                <span className="font-label-lg text-label-lg text-on-surface">⏳ Retraso para iniciar (10-15 min)</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
              </button>
              <button className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left flex items-center justify-between transition-colors" onClick={() => submitIncident('Imprevisto Médico / Lesión')}>
                <span className="font-label-lg text-label-lg text-on-surface">🩹 Lesión de alumno o docente</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
              </button>
              <button className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-left flex items-center justify-between transition-colors" onClick={() => submitIncident('Problema Técnico')}>
                <span className="font-label-lg text-label-lg text-on-surface">🔧 Problema con barra/equipo</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
              </button>
            </div>
            <button className="w-full py-3 rounded-xl bg-transparent border border-surface-container-highest text-secondary font-label-md text-label-md hover:bg-surface-container transition-colors" onClick={() => setIsIncidentModalOpen(false)}>
              Cancelar y volver
            </button>
          </div>
        </div>
      )}

      <div className={`fixed top-20 inset-x-4 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="bg-surface-container-highest border border-surface-container-high text-on-surface px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}