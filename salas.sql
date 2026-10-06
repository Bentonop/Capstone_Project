-- Crear tabla de Salas
CREATE TABLE IF NOT EXISTS public.salas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Añadir columna de sala por defecto a la tabla de perfiles (opcional)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sala_por_defecto text;
