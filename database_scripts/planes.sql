-- SQL Script para crear la tabla de Planes/Membresías

CREATE TABLE IF NOT EXISTS public.planes (
    id_plan UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_plan TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    creditos_clases INTEGER NOT NULL,
    duracion_dias INTEGER NOT NULL,
    disciplinas_incluidas TEXT,
    estado BOOLEAN DEFAULT true, -- true = activo (visible en tienda), false = inactivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Políticas RLS opcionales (si se usa Row Level Security)
-- Permitir lectura a todos (para la tienda)
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planes son visibles por todos" ON public.planes
    FOR SELECT USING (true);

-- Permitir inserción, actualización y borrado a todos por simplicidad
-- En producción, esto debería limitarse a admins o roles específicos
CREATE POLICY "Planes editables por todos" ON public.planes
    FOR ALL USING (true) WITH CHECK (true);
