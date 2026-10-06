"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TiendaPage() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment Modal State
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"transferencia" | "integrado" | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanes();
  }, []);

  async function fetchPlanes() {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("planes")
        .select("*")
        .eq("estado", true)
        .order("precio", { ascending: false });
      
      if (error) throw error;
      setPlanes(data || []);
    } catch (error) {
      console.error("Error fetching planes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const procesarCompra = async () => {
    if (!selectedPlan || !paymentMethod) return;
    if (paymentMethod === "transferencia" && !comprobanteUrl.trim()) {
      alert("Por favor ingresa el Nro de Comprobante.");
      return;
    }

    setIsProcessing(true);
    try {
      if (!supabase) throw new Error("Supabase no inicializado");
      
      // Get current mock user
      const { data: user } = await supabase.from("profiles").select("id").eq("role", "alumno").order("created_at", { ascending: true }).limit(1).single();
      if (!user) throw new Error("No hay usuario alumno de prueba en la DB.");

      const isManual = paymentMethod === "transferencia";
      const estadoSub = isManual ? "pendiente" : "activa";
      const estadoPago = isManual ? "pendiente" : "aprobado";
      const creditos = isManual ? 0 : selectedPlan.creditos_clases;

      // 1. Crear Suscripcion
      const { data: subData, error: subError } = await supabase.from("user_suscripciones").insert({
        user_id: user.id,
        plan_id: selectedPlan.id_plan,
        estado: estadoSub,
        creditos_restantes: creditos
      }).select("id").single();

      if (subError) throw subError;

      // 2. Crear Pago
      const { error: pagoError } = await supabase.from("user_pagos").insert({
        suscripcion_id: subData.id,
        user_id: user.id,
        monto: selectedPlan.precio,
        metodo_pago: paymentMethod,
        estado: estadoPago,
        comprobante_url: isManual ? comprobanteUrl : "TRANSACCION_WEBPAY_12345"
      });

      if (pagoError) throw pagoError;

      // 3. Incrementar ventas del plan
      const currentVentas = selectedPlan.ventas || 0;
      await supabase
        .from("planes")
        .update({ ventas: currentVentas + 1 })
        .eq("id_plan", selectedPlan.id_plan);
        
      fetchPlanes(); // Refresh planes to update UI

      setSelectedPlan(null);
      setPaymentMethod(null);
      setComprobanteUrl("");
      
      if (isManual) {
        showToast("¡Comprobante enviado! El administrador lo revisará pronto.");
      } else {
        showToast("¡Pago exitoso! Tus créditos han sido agregados.");
      }
      
    } catch (error) {
      console.error("Error al comprar", error);
      alert("Error al procesar la compra. Revisa que las tablas SQL estén creadas.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-bottom-nav-safe min-h-screen bg-surface relative">
      <div className="flex flex-col px-margin-mobile gap-space-lg pt-space-md">
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[28px] text-primary">storefront</span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">Planes Disponibles</h1>
          </div>
          <button className="flex items-center text-secondary font-label-md">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Filtrar
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></div>
        ) : planes.length === 0 ? (
          <div className="p-8 bg-surface-container-low border border-surface-container rounded-2xl text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-[48px] text-secondary mb-3">production_quantity_limits</span>
            <h3 className="font-headline-sm text-on-surface">Sin planes disponibles</h3>
            <p className="font-body-sm text-on-surface-variant mt-1">Actualmente no hay planes a la venta. Por favor consulta más tarde.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {(() => {
              const maxVentas = Math.max(0, ...planes.map(p => p.ventas || 0));
              const destacadoId = maxVentas > 0 
                ? planes.find(p => (p.ventas || 0) === maxVentas)?.id_plan 
                : planes[0]?.id_plan;

              return planes.map((plan) => {
                const isDestacado = plan.id_plan === destacadoId;
                
                return (
                <div key={plan.id_plan} onClick={() => setSelectedPlan(plan)} className={`flex flex-col rounded-2xl border shadow-sm p-space-lg gap-space-md cursor-pointer hover:shadow-md transition-all active:scale-[0.99] hover:border-primary/50 ${isDestacado ? 'bg-surface-container-lowest border-primary/30 border-2' : 'bg-surface-container-low border-surface-container'}`}>
                  {isDestacado && (
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                      <span className="font-label-md font-bold uppercase tracking-wider">Plan destacado</span>
                    </div>
                  )}
                  
                  <div className="flex items-end justify-between border-b border-surface-container pb-3">
                    <span className={`font-label-lg font-bold ${isDestacado ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {plan.duracion_dias} días
                    </span>
                    <span className="font-headline-sm font-bold text-on-surface">
                      $ {plan.precio.toLocaleString()}
                    </span>
                  </div>

                  <h2 className="font-headline-sm text-[22px] text-on-surface leading-snug">
                    {plan.nombre_plan}
                  </h2>

                  <ul className="flex flex-col gap-3 mt-1">
                    <li className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isDestacado ? 'text-primary' : 'text-secondary'}`}>database</span>
                      <div className="flex flex-col">
                        <span className="font-body-md text-on-surface font-medium">Incluye {plan.creditos_clases} cupos</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isDestacado ? 'text-primary' : 'text-secondary'}`}>fitness_center</span>
                      <div className="flex flex-col">
                        <span className="font-body-md text-on-surface font-medium">Disciplinas</span>
                        <span className="font-body-sm text-[13px] text-on-surface-variant">{plan.disciplinas_incluidas}</span>
                      </div>
                    </li>
                  </ul>

                  <p className="font-body-sm text-[13px] text-on-surface-variant mt-2 mb-2 leading-relaxed italic border-l-2 border-surface-container-highest pl-3">
                    {plan.descripcion}
                  </p>

                  <button 
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full h-14 rounded-xl font-label-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm ${isDestacado ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
                  >
                    Adquirir
                    <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                  </button>
                </div>
              );
            })})()}
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto border border-surface-container">
            
            <div className="flex justify-between items-center p-4 border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-sm text-on-surface font-bold">Método de Pago</h3>
              <button onClick={() => { setSelectedPlan(null); setPaymentMethod(null); }} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 pb-24 flex flex-col gap-5">
              <div className="bg-surface-container-low p-4 rounded-xl flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">Total a pagar:</span>
                <span className="font-headline-sm font-bold text-on-surface">${selectedPlan.precio.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setPaymentMethod("integrado")}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${paymentMethod === 'integrado' ? 'border-primary bg-primary/5' : 'border-surface-container bg-surface-container-lowest'}`}
                >
                  <span className={`material-symbols-outlined text-[28px] ${paymentMethod === 'integrado' ? 'text-primary' : 'text-on-surface-variant'}`}>credit_card</span>
                  <div className="flex flex-col text-left">
                    <span className="font-label-lg text-on-surface font-bold">Pago en línea (Webpay)</span>
                    <span className="font-body-sm text-on-surface-variant">Aprobación instantánea</span>
                  </div>
                </button>

                <button 
                  onClick={() => setPaymentMethod("transferencia")}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${paymentMethod === 'transferencia' ? 'border-primary bg-primary/5' : 'border-surface-container bg-surface-container-lowest'}`}
                >
                  <span className={`material-symbols-outlined text-[28px] ${paymentMethod === 'transferencia' ? 'text-primary' : 'text-on-surface-variant'}`}>account_balance</span>
                  <div className="flex flex-col text-left">
                    <span className="font-label-lg text-on-surface font-bold">Transferencia Manual</span>
                    <span className="font-body-sm text-on-surface-variant">Requiere validación admin</span>
                  </div>
                </button>
              </div>

              {/* Transferencia Details */}
              {paymentMethod === "transferencia" && (
                <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-label-md font-bold text-on-surface border-b border-surface-container-highest pb-2">Datos Bancarios</h4>
                  <ul className="font-body-sm text-on-surface-variant flex flex-col gap-1.5">
                    <li><span className="font-bold">Banco:</span> Banco Estado</li>
                    <li><span className="font-bold">Cuenta Rut:</span> 12.345.678-9</li>
                    <li><span className="font-bold">Nombre:</span> Cuerpo y Alma</li>
                    <li><span className="font-bold">Correo:</span> pagos@cuerpoyalma.cl</li>
                  </ul>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="font-label-sm font-bold text-on-surface">Comprobante de Transferencia:</label>
                    <div className="relative">
                      <input 
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                           const file = e.target.files?.[0];
                           if(file) {
                              setFileName(file.name);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                 setComprobanteUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                           }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="h-12 px-3 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-primary flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">{fileName ? 'check_circle' : 'add_photo_alternate'}</span>
                        <span className="font-label-md font-bold truncate max-w-[200px]">
                           {fileName ? fileName : "Seleccionar foto"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={procesarCompra}
                disabled={!paymentMethod || isProcessing}
                className="w-full h-14 mt-2 bg-primary text-on-primary rounded-xl font-label-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {isProcessing ? (
                  <span className="material-symbols-outlined animate-spin text-[24px]">refresh</span>
                ) : (
                  <>
                    {paymentMethod === 'transferencia' ? 'Enviar Comprobante' : 'Confirmar Pago'}
                    <span className="material-symbols-outlined">{paymentMethod === 'transferencia' ? 'send' : 'lock'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 flex items-center justify-center animate-in slide-in-from-top-4">
          <div className="bg-surface-container-highest text-on-surface px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-500 text-[24px]">check_circle</span>
            <span className="font-label-md font-bold text-[15px]">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
