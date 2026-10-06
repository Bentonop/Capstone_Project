-- Script para crear la tabla de plantillas de clases (horarios fijos)

CREATE TABLE IF NOT EXISTS public.plantillas_clase (
  id_plantilla UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Domingo, 1=Lunes, ..., 6=Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  nombre_clase VARCHAR(100) NOT NULL,
  id_profesor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sala VARCHAR(100),
  cupo_maximo INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de Seguridad (RLS)
ALTER TABLE public.plantillas_clase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública para perfiles autenticados" 
ON public.plantillas_clase FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Modificación solo para administradores" 
ON public.plantillas_clase FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
  )
);
