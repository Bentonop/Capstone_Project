-- Script de creación para la tabla notificaciones MVP

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL DEFAULT 'informativa', -- critica, operativa, informativa
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT false,
    clase_id INTEGER REFERENCES public.clase(id_clase) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas (Para el MVP permitiremos que los autenticados lean e inserten)
CREATE POLICY "Permitir select a usuarios autenticados" 
ON public.notificaciones FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Permitir insert a usuarios autenticados" 
ON public.notificaciones FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir update a usuarios autenticados" 
ON public.notificaciones FOR UPDATE 
TO authenticated USING (true);

-- 4. Habilitar Supabase Realtime para la tabla notificaciones
-- Esto permite que el frontend escuche cambios instantáneos
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
