-- SQL Script para crear las tablas de Suscripciones y Pagos

-- 1. Tabla de Suscripciones de Usuarios (relaciona alumno con un plan)
CREATE TABLE IF NOT EXISTS public.user_suscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_id UUID NOT NULL REFERENCES public.planes(id_plan),
    creditos_restantes INTEGER NOT NULL DEFAULT 0,
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'activa', 'vencida', 'cancelada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Pagos (registra el pago manual o automático de una suscripción)
CREATE TABLE IF NOT EXISTS public.user_pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suscripcion_id UUID NOT NULL REFERENCES public.user_suscripciones(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    monto NUMERIC(10, 2) NOT NULL,
    metodo_pago TEXT NOT NULL, -- 'transferencia', 'tarjeta_integrada'
    comprobante_url TEXT, -- Código de transferencia o link a imagen
    estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'rechazado'
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Políticas RLS opcionales (si se usa Row Level Security)
ALTER TABLE public.user_suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pagos ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura abierta por ahora (para desarrollo rápido)
-- IMPORTANTE: En producción, esto debe restringirse para que el alumno solo vea lo suyo.
CREATE POLICY "Suscripciones full access" ON public.user_suscripciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Pagos full access" ON public.user_pagos FOR ALL USING (true) WITH CHECK (true);
