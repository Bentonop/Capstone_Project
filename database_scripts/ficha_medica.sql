-- Añadir columnas para ficha médica y contacto de emergencia a la tabla de perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contacto_emergencia text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ficha_medica text;
