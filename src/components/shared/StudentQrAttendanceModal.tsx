"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import QrScanner from "@/components/shared/QrScanner";
import toast from "react-hot-toast";

interface StudentQrAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StudentQrAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
}: StudentQrAttendanceModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanResult = async (decodedText: string) => {
    if (isProcessing || successInfo) return;

    let targetClaseId: number | null = null;
    try {
      const parsed = JSON.parse(decodedText);
      targetClaseId = Number(parsed.id_clase);
    } catch {
      targetClaseId = Number(decodedText) || null;
    }

    if (!targetClaseId) {
      toast.error("El código QR no corresponde a una clase válida.");
      return;
    }

    setIsProcessing(true);
    try {
      if (!supabase) throw new Error("No hay cliente Supabase disponible");

      // 1. Obtener usuario autenticado
      let userId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) userId = user.id;
      } catch (e) {
        console.error("Error obteniendo usuario:", e);
      }

      if (!userId) {
        const { data: fallbackUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "alumno")
          .limit(1)
          .maybeSingle();
        userId = fallbackUser?.id || null;
      }

      if (!userId) {
        toast.error("Debes iniciar sesión para registrar tu asistencia.");
        setIsProcessing(false);
        return;
      }

      // 2. Buscar si el alumno tiene reserva para esta clase
      const { data: reserva, error: resError } = await supabase
        .from("reserva")
        .select(`
          id_reserva,
          estado_reserva,
          id_clase,
          clase (
            id_clase,
            nombre_clase,
            sala
          )
        `)
        .eq("id_usuario", userId)
        .eq("id_clase", targetClaseId)
        .maybeSingle();

      if (resError) throw resError;

      if (!reserva) {
        toast.error("No tienes una reserva para esta clase. Por favor reserva primero.");
        setIsProcessing(false);
        return;
      }

      if (reserva.estado_reserva === "cancelada") {
        toast.error("Tu reserva para esta clase se encuentra cancelada.");
        setIsProcessing(false);
        return;
      }

      const claseInfo = Array.isArray(reserva.clase) ? reserva.clase[0] : reserva.clase;
      const nombreClase = claseInfo?.nombre_clase || "tu clase";

      if (reserva.estado_reserva === "presente") {
        toast("Ya habías confirmado tu asistencia a esta clase previamente.");
        setSuccessInfo(`¡Ya estabas registrada/o en ${nombreClase}!`);
        setTimeout(() => {
          onClose();
          setSuccessInfo(null);
        }, 1800);
        return;
      }

      // 3. Registrar asistencia en la tabla asistencia
      const { error: asisError } = await supabase
        .from("asistencia")
        .upsert({
          id_reserva: reserva.id_reserva,
          asistio: true,
          fecha_hora_ingreso: new Date().toISOString(),
          metodo_ingreso: "QR_AUTOSERVICIO",
          token_qr_usado: `autoservicio-${targetClaseId}`
        }, { onConflict: "id_reserva" });

      if (asisError) {
        console.warn("Advertencia en tabla asistencia:", asisError);
      }

      // 4. Actualizar estado de la reserva a "presente"
      const { error: updateResError } = await supabase
        .from("reserva")
        .update({ estado_reserva: "presente" })
        .eq("id_reserva", reserva.id_reserva);

      if (updateResError) throw updateResError;

      // Haptic feedback en móviles
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }

      toast.success(`¡Asistencia confirmada para ${nombreClase}!`);
      setSuccessInfo(`¡Bienvenida/o a ${nombreClase}!`);

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessInfo(null);
      }, 1800);

    } catch (err: any) {
      console.error("Error al procesar QR:", err);
      toast.error("Hubo un error al registrar la asistencia. Intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-surface-container flex flex-col items-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base text-on-surface font-bold">Marcar Asistencia</h3>
              <p className="font-body-sm text-xs text-secondary">Escanear QR de la sala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Cámara / Viewfinder */}
        {successInfo ? (
          <div className="w-full py-10 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h4 className="font-headline-sm text-lg font-bold text-on-surface">¡Ingreso Registrado!</h4>
            <p className="font-body-sm text-sm text-secondary max-w-[240px]">{successInfo}</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-[280px]">
              <QrScanner onResult={handleScanResult} id="student-attendance-scanner" />
            </div>

            <p className="font-body-sm text-xs text-secondary text-center mt-4">
              Apunta con la cámara al código QR que proyecta tu profesor o que se encuentra en la entrada de la sala.
            </p>

            {isProcessing && (
              <div className="mt-3 flex items-center gap-2 text-primary font-label-md text-xs">
                <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                Validando reserva con la academia...
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-surface-container text-on-surface font-label-md font-medium hover:bg-surface-container-high transition-colors text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
